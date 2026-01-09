import { dnsPacket } from "../_dependencies.js";
import {
  dnsPacket as dnsPacketModule
} from "../_dependencies.js";

import type { OptionsInterface } from "./Options/index.js";
import { Options } from "./Options/index.js";
import type { Socket, RemoteInfo } from "node:dgram";
import dgram from "node:dgram";
import type { DecodedPacket } from "dns-packet";
import type { Logger } from "pino";


export {
  Options
}

export class App {
  protected isReady: boolean = false;
  protected socket!: Socket;

  protected options!: OptionsInterface;
  protected logger: Logger | null = null;

  constructor() {
    this.options = new Options();
  }

  public setOptions(
    options: OptionsInterface
  ): void {
    this.options = options;
  }

  public setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Получить logger или использовать fallback на console
   */
  protected getLogger(): Logger {
    if (this.logger) {
      return this.logger;
    }
    // Fallback на console если logger не установлен
    return {
      error: (...args: any[]) => console.error(...args),
      warn: (...args: any[]) => console.warn(...args),
      info: (...args: any[]) => console.log(...args),
      debug: (...args: any[]) => console.debug(...args),
    } as Logger;
  }

  public async run() {
    this.getLogger().info('App.run');
    this.initSocket();
  }

  protected initSocket(): void {
    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', this.onSocketError.bind(this));
    this.socket.on('message', this.onSocketMessage.bind(this));
    this.socket.bind(
      this.options.bindPort,
      this.options.bindHost,
      this.onSocketBind.bind(this)
    );
  }

  async onSocketBind() {
    this.getLogger().info(`DNS Прокси запущен на ${this.options.bindHost}:${this.options.bindPort}`);
  }

  async onSocketError(error: Error) {
    const logger = this.getLogger();
    if (error.message.includes('EADDRINUSE')) {
      logger.error(`Ошибка: Порт ${this.options.bindPort} уже занят другим процессом.`);
      logger.error(`Используйте другой порт в конфигурации или остановите процесс, использующий этот порт.`);
    } else {
      logger.error({ err: error, stack: error.stack }, `Ошибка сервера`);
    }
    this.socket.close();
  }

  /**
   * Обработчик DNS запроса от клиента
   * @param msg - Буфер с DNS запросом
   * @param remoteInfo - Информация о клиенте
   * @returns
   */
  async onSocketMessage(
    msg: Buffer,
    remoteInfo: RemoteInfo
  ): Promise<void> {
    const logger = this.getLogger();
    logger.trace({ msg, remoteInfo }, 'App.onSocketMessage:BEG: [msg, rinfo]');
    try {

      let dnsRequest: dnsPacketModule.DecodedPacket;
      try {
        dnsRequest = dnsPacket.decode(msg);
      } catch (e) {
        logger.error({ err: e }, 'App.onSocketMessage: Ошибка декодирования пакета');
        this.sendErrorResponse(msg, remoteInfo);
        return;
      }
      logger.trace({ dnsRequest: JSON.stringify(dnsRequest) }, 'App.onSocketMessage:[dnsRequest]');

      const question: dnsPacketModule.Question | undefined = dnsRequest.questions?.[0];
      logger.debug({ question }, 'App.onSocketMessage:[question]');

      if (!question) {
        logger.error('App.onSocketMessage: DNS запрос не содержит вопросов');
        this.sendErrorResponse(msg, remoteInfo);
        return;
      }
      const dnsName: string = question.name; // Имя DNS, которое запрашивается
      logger.debug({ dnsName, address: remoteInfo.address }, 'App.onSocketMessage');

      const targetIp: string | string[] | dnsPacket.Answer[] | false = await this.getIp(dnsName);
      if (typeof targetIp === 'string' || Array.isArray(targetIp)) {
        this.sendSuccessResponse(dnsRequest, remoteInfo, targetIp);
        return;
      }

      this.sendErrorResponse(dnsRequest, remoteInfo);
    } finally {
      logger.trace({ msg, remoteInfo }, 'App.onSocketMessage:END: [msg, rinfo]');
    }
  }


  /**
   * Отправляет ошибку на DNS запрос
   * @param dnsRequest - DNS запрос
   * @param remoteInfo - Информация о клиенте
   */
  protected sendErrorResponse(
    dnsRequest: dnsPacketModule.DecodedPacket | Buffer,
    remoteInfo: RemoteInfo
  ): void {
    const logger = this.getLogger();
    logger.trace({ dnsRequest, remoteInfo }, 'App.sendErrorResponse:BEG: [dnsRequest, rinfo]');
    try {
      const response: dnsPacketModule.Packet = {
        type: 'response',
        id: 0,
        // RCODE (Response Code) is the last 4 bits of flags;
        // FORMERR is 1. So, set QR=1 (response), OPCODE=0, AA=0, TC=0, RD=0, RA=0, Z=0, AD=0, CD=0, and RCODE=1
        flags: 0x8001,
        questions: typeof dnsRequest === 'object' && 'questions' in dnsRequest ? (
          dnsRequest as dnsPacketModule.DecodedPacket
        ).questions : [],
        answers: []
      };
      if (dnsRequest instanceof Buffer) {
        response.id = (
          dnsRequest.length >= 2 && typeof (
            dnsRequest as Buffer
          ).readUInt16BE === 'function'
        )
          ? (
            dnsRequest as Buffer
          ).readUInt16BE(0)
          : 0;
      } else if (typeof dnsRequest === "object") {
        if ("id" in dnsRequest
          && typeof (
            dnsRequest as any
          ).id === "number"
        ) {
          response.id = (
            dnsRequest as {
              id: number
            }
          ).id;
        }
      }
      const answer = dnsPacket.encode(response);
      this.getLogger().warn({ answer, remoteInfo }, 'App.sendErrorResponse:[answer]');
      this.socket.send(answer, remoteInfo.port, remoteInfo.address);
    } finally {
      logger.trace('App.sendErrorResponse:END');
    }

  }

  /**
   * Отправляет успешный ответ на DNS запрос
   * @param response - DNS ответ
   * @param remoteInfo - Информация о клиенте
   * @param result - Результат DNS запроса
   */
  protected sendSuccessResponse(
    response: dnsPacketModule.Packet,
    remoteInfo: RemoteInfo,
    result: string | string[] | dnsPacket.Answer[]
  ): void {
    const logger = this.getLogger();
    logger.trace({ response, remoteInfo }, 'App.sendSuccessResponse:BEG: [response, rinfo]');
    try {
      const dnsName: string = response.questions?.[0]?.name ?? '';

      response.flags = dnsPacketModule.AUTHORITATIVE_ANSWER; // Устанавливаем флаг AUTHORITATIVE_ANSWER
      if (typeof result === 'string') {
        result = [result];
      }


      for (const ip of result) {
        let answer: dnsPacketModule.Answer;
        if (typeof ip === 'string') {
          answer = {
            type: 'A',
            class: 'IN',
            name: dnsName,
            data: ip,
            ttl: 300
          };
        } else if (typeof ip === 'object' && ip !== null && 'type' in ip && 'name' in ip && 'data' in ip) {
          answer = ip as dnsPacketModule.Answer;
        } else {
          continue;
        }
        response.answers?.push(answer);
      }
      const answer = dnsPacket.encode(response);
      this.getLogger().info({ responseAnswers: response.answers }, 'App.sendSuccessResponse:[answer]');
      this.getLogger().debug({ responseAnswers: response.answers, answer }, 'App.sendSuccessResponse:[answer]');
      this.socket.send(answer, remoteInfo.port, remoteInfo.address);
    } finally {
      logger.trace('App.sendSuccessResponse:END');
    }
  }

  /**
   * Функция поиска IP адреса DNS
   * @param dnsName - Имя DNS
   * @returns IP адрес или false
   */
  protected async getIp(
    dnsName: string
  ): Promise<string | dnsPacket.Answer[] | false> {
    const logger = this.getLogger();
    logger.trace({ dnsName }, 'App.getIp:BEG:[dnsName]');
    try {
      let res = await this.getIpLocal(dnsName);
      if (res !== false) {
        logger.info({ dnsName, ip: res }, 'App.getIp: found in hosts list');
        return res;
      }
      logger.debug({ dnsName, ip: res }, 'App.getIp: not found in hosts list');

      // Перебираем маски из masked-dns в порядке их указания в файле
      for (const [mask, chainName] of this.options.maskedDns.entries()) {
        // Проверяем, соответствует ли dnsName маске
        if (!this.matchDnsMask(dnsName, mask)) {
          continue;
        }

        logger.debug({ dnsName, mask, chainName }, 'App.getIp: dnsName matches mask, using chain');

        // Извлекаем цепочку DNS-серверов по названию
        const dnsChain = this.options.upstreamDnsChains.get(chainName);
        if (!dnsChain || dnsChain.length === 0) {
          logger.warn({ dnsName, chainName }, 'App.getIp: chain not found or empty. Skip.');
          break;//@NOTE: проверяем только первую цепочку по маске
        }

        // Перебираем DNS-серверы в цепочке в порядке их указания
        for (const serverAddress of dnsChain) {
          logger.debug({ dnsName, serverAddress, chainName }, 'App.getIp: will try to get IP from upstream DNS-server');
          const res: false | dnsPacket.Answer[] = await this.getIpUpstream(dnsName, serverAddress);
          if (res === false) {
            logger.debug({ dnsName, serverAddress, chainName, res }, 'App.getIp: not found in upstream DNS-server');
            continue;
          }
          logger.debug({ dnsName, serverAddress, chainName, res }, 'App.getIp: found in upstream DNS-server');
          return res;
        }
        break;//@NOTE: проверяем только первую цепочку по маске
      }

      logger.info({ dnsName }, 'App.getIp: not found at all');

      return false;
    } finally {
      logger.trace('App.getIp:END');
    }
  }

  /**
   * Функция поиска в локальном списке хостов
   * @param dnsName - Имя DNS
   * @returns IP адрес или false
   */
  protected async getIpLocal(
    dnsName: string
  ): Promise<string | false> {
    const logger = this.getLogger();
    logger.trace({ dnsName }, 'App.getIpLocal:BEG:[dnsName]');
    try {
      const targetIp = this.options.hosts.get(dnsName);

      if (targetIp) {
        logger.info({ dnsName, targetIp }, 'App.getIpLocal: found in local hosts list');
        return targetIp;
      }
      return false;
    } finally {
      logger.trace('App.getIpLocal:END');
    }
  }

  /**
   * Проверяет, соответствует ли DNS-имя маске
   * @param dnsName - DNS имя для проверки
   * @param mask - Маска (например, "*.company.local" или "*")
   * @returns true если соответствует, false иначе
   */
  protected matchDnsMask(
    dnsName: string,
    mask: string
  ): boolean {
    // Если маска - просто "*", то соответствует любому имени
    if (mask === '*') {
      return true;
    }

    // Преобразуем маску в регулярное выражение
    // Экранируем специальные символы и заменяем * на .*
    const regexPattern = mask
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Экранируем специальные символы
      .replace(/\*/g, '.*'); // Заменяем * на .*

    const regex = new RegExp(`^${regexPattern}$`, 'i');

    const res = regex.test(dnsName);
    this.getLogger().trace({ dnsName, mask, res }, 'App.matchDnsMask');
    return res;
  }

  /**
   * Парсит адрес сервера в формате IP:PORT
   * @param serverAddress - Адрес в формате "IP:PORT" или просто "IP"
   * @returns Объект с ip и port
   */
  protected parseServerAddress(
    serverAddress: string
  ): {
    ip: string;
    port: number
  } {
    const parts = serverAddress.split(':');
    if (parts.length < 1 || !parts[0]) {
      this.getLogger().error({ serverAddress }, 'App.parseServerAddress: invalid serverAddress');
      throw new Error('Invalid serverAddress');
    }
    const ip: string = parts[0];
    const port: number = parts.length > 1 && parts[1] ? parseInt(parts[1], 10) : 53;

    const res = {
      ip,
      port: isNaN(port) ? 53 : port
    };
    this.getLogger().trace({ serverAddress, res }, 'App.parseServerAddress');
    return res;
  }

  async getIpUpstream(
    dnsName: string,
    serverAddress: string
  ): Promise<dnsPacket.Answer[] | false> {
    const logger = this.getLogger();
    logger.trace({ dnsName, serverAddress }, 'App.getIpUpstream:BEG:[dnsName]');
    try {
      // Парсим адрес сервера (поддерживаем формат IP:PORT)
      const { ip, port } = this.parseServerAddress(serverAddress);
      logger.debug({ dnsName, ip, port }, 'App.getIpUpstream');

      const res: dnsPacket.Answer[] | false = await new Promise(
        (resolve) => {
          const client = dgram.createSocket('udp4');

          const query = dnsPacket.encode({
            type: 'query',
            id: Math.floor(Math.random() * 65534),
            flags: dnsPacket.RECURSION_DESIRED,
            questions: [{
              type: 'A',
              name: dnsName
            }]
          });

          const timeout = setTimeout(() => {
            client.close();
            return resolve(false);
          }, 2000);

          client.on('message', (msg) => {
            clearTimeout(timeout);
            const response: dnsPacketModule.DecodedPacket = dnsPacketModule.decode(msg);
            client.close();
            if (
              response.answers
              &&
              response.answers.length > 0
            ) {
              return resolve(response.answers);
            }
            return resolve(false);
          });

          client.send(
            query,
            port,
            ip,
            (err) => {
              if (err) {
                logger.trace({ err }, 'App.getIpUpstream:[err]');

                clearTimeout(timeout);
                client.close();
                resolve(false);
              }
            }
          );
        }
      );
      logger.trace({ res }, 'App.getIpUpstream:[res]');
      return res;
    } finally {
      logger.trace('App.getIpUpstream:END');
    }
  }

}
