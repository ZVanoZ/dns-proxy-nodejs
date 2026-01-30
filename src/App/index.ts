import { dnsPacket, type DecodedPacket } from "../_dependencies.js";
import {
  dnsPacket as dnsPacketModule
} from "../_dependencies.js";

import type { OptionsInterface } from "./Options/index.js";
import { Options } from "./Options/index.js";
import type { Socket, RemoteInfo } from "node:dgram";
import dgram from "node:dgram";
import type { Logger } from "pino";
import type { DnsCacheInterface } from "../DnsCache/index.js";
import type { AnswerSource, IpLookupResult } from "./types.js";


export {
  Options
}

export class App {
  protected isReady: boolean = false;
  /** Сокет UDP IPv4 (null, если v4host не задан). */
  protected v4Socket: Socket | null = null;
  /** Сокет UDP IPv6 (null, если v6host не задан). */
  protected v6Socket: Socket | null = null;

  protected options!: OptionsInterface;
  protected logger: Logger | null = null;

  /**
   * Кеш DNS запросов (опционально)
   */
  protected dnsCache: DnsCacheInterface | null = null;

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
   * Установить кеш DNS запросов
   */
  public setDnsCache(cache: DnsCacheInterface): void {
    this.dnsCache = cache;
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
    const port = this.options.bindPort;
    const logger = this.getLogger();

    const bindV4 = (): void => {
      if (!this.options.bindV4Host) return;
      const s = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      s.on('error', (err: Error) => this.onSocketError(s, err));
      s.on('message', (msg: Buffer, rinfo: RemoteInfo) => this.onSocketMessage(msg, rinfo, s));
      s.bind(port, this.options.bindV4Host, () => {
        logger.info(`DNS Прокси (IPv4) запущен на ${this.options.bindV4Host}:${port}`);
      });
      this.v4Socket = s;
    };

    if (this.options.bindV6Host) {
      const s6 = dgram.createSocket({ type: 'udp6', reuseAddr: true, ipv6Only: true });
      s6.on('error', (err: Error) => this.onSocketError(s6, err));
      s6.on('message', (msg: Buffer, rinfo: RemoteInfo) => this.onSocketMessage(msg, rinfo, s6));
      s6.bind(port, this.options.bindV6Host, () => {
        logger.info(`DNS Прокси (IPv6) запущен на ${this.options.bindV6Host}:${port}`);
        bindV4();
      });
      this.v6Socket = s6;
    } else {
      bindV4();
    }
  }

  protected onSocketError(socket: Socket, error: Error): void {
    const logger = this.getLogger();
    if (error.message.includes('EADDRINUSE')) {
      logger.error(`Ошибка: Порт уже занят другим процессом.`);
      logger.error(`Используйте другой порт в конфигурации или остановите процесс, использующий этот порт.`);
    } else {
      logger.error({ err: error, stack: error.stack }, `Ошибка сервера`);
    }
    socket.close();
  }

  /**
   * Обработчик DNS запроса от клиента
   * @param msg - Буфер с DNS запросом
   * @param remoteInfo - Информация о клиенте
   * @param socket - Сокет, с которого пришёл запрос (для ответа тем же сокетом)
   */
  async onSocketMessage(
    msg: Buffer,
    remoteInfo: RemoteInfo,
    socket: Socket
  ): Promise<void> {
    const logger = this.getLogger();
    logger.trace({ msg, remoteInfo }, 'App.onSocketMessage:BEG: [msg, rinfo]');
    try {

      let dnsRequest: dnsPacketModule.DecodedPacket;
      try {
        dnsRequest = dnsPacket.decode(msg);
      } catch (e) {
        logger.error({ err: e }, 'App.onSocketMessage: Ошибка декодирования пакета');
        this.sendErrorResponse(msg, remoteInfo, socket);
        return;
      }
      logger.trace({ dnsRequest: JSON.stringify(dnsRequest) }, 'App.onSocketMessage:[dnsRequest]');

      const question: dnsPacketModule.Question | undefined = dnsRequest.questions?.[0];
      logger.debug({ question }, 'App.onSocketMessage:[question]');

      if (!question) {
        logger.error('App.onSocketMessage: DNS запрос не содержит вопросов');
        this.sendErrorResponse(msg, remoteInfo, socket);
        return;
      }
      const dnsName: string = question.name; // Имя DNS, которое запрашивается
      logger.debug({ dnsName, address: remoteInfo.address }, 'App.onSocketMessage');

      // Получаем результат с информацией об источнике
      const lookupResult: IpLookupResult = await this.getIp(dnsName);

      if (typeof lookupResult.result === 'string' || Array.isArray(lookupResult.result)) {
        this.sendSuccessResponse(
          dnsRequest,
          remoteInfo,
          lookupResult.result,
          lookupResult.answerSource,
          socket
        );
        return;
      }

      this.sendErrorResponse(dnsRequest, remoteInfo, socket);
    } finally {
      logger.trace({ msg, remoteInfo }, 'App.onSocketMessage:END: [msg, rinfo]');
    }
  }


  /**
   * Отправляет ошибку на DNS запрос
   * @param dnsRequest - DNS запрос
   * @param remoteInfo - Информация о клиенте
   * @param socket - Сокет для отправки ответа
   */
  protected sendErrorResponse(
    dnsRequest: dnsPacketModule.DecodedPacket | Buffer,
    remoteInfo: RemoteInfo,
    socket: Socket
  ): void {
    const logger = this.getLogger();
    logger.trace({ dnsRequest, remoteInfo }, 'App.sendErrorResponse:BEG: [dnsRequest, rinfo]');
    try {
      const response: dnsPacketModule.Packet = {
        type: 'response',
        id: 0,
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
      socket.send(answer, remoteInfo.port, remoteInfo.address);
    } finally {
      logger.trace('App.sendErrorResponse:END');
    }

  }

  /**
   * Отправляет успешный ответ на DNS запрос
   * @param response - DNS ответ
   * @param remoteInfo - Информация о клиенте
   * @param result - Результат DNS запроса
   * @param answerSource - Информация об источнике ответа
   * @param socket - Сокет для отправки ответа
   */
  protected sendSuccessResponse(
    response: dnsPacketModule.Packet,
    remoteInfo: RemoteInfo,
    result: string | string[] | dnsPacket.Answer[],
    answerSource: AnswerSource,
    socket: Socket
  ): void {
    const logger = this.getLogger();
    logger.trace({ response, remoteInfo, answerSource }, 'App.sendSuccessResponse:BEG: [response, rinfo, answerSource]');
    try {
      const dnsName: string = response.questions?.[0]?.name ?? '';

      response.flags = dnsPacketModule.AUTHORITATIVE_ANSWER;
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

      const logData = {
        responseAnswers: response.answers,
        'answer-source': answerSource
      };

      this.getLogger().info(logData, 'App.sendSuccessResponse:[answer]');
      this.getLogger().debug({ ...logData, answer }, 'App.sendSuccessResponse:[answer]');

      socket.send(answer, remoteInfo.port, remoteInfo.address);
    } finally {
      logger.trace('App.sendSuccessResponse:END');
    }
  }

  /**
   * Функция поиска IP адреса DNS
   * @param dnsName - Имя DNS
   * @returns Результат поиска с информацией об источнике
   */
  protected async getIp(
    dnsName: string
  ): Promise<IpLookupResult> {
    const logger = this.getLogger();
    logger.trace({ dnsName }, 'App.getIp:BEG:[dnsName]');
    try {
      // 1. Проверка локальных хостов
      const localResult = await this.getIpLocal(dnsName);
      if (localResult !== false) {
        logger.debug({ dnsName, ip: localResult }, 'App.getIp: found in hosts list');
        return {
          result: localResult,
          answerSource: {
            'masked-dns': null,
            'real-source': 'hosts'
          }
        };
      }
      logger.debug({ dnsName, ip: localResult }, 'App.getIp: not found in hosts list');

      // 2. Проверка кеша перед upstream запросом
      if (this.dnsCache) {
        const cached = this.dnsCache.get(dnsName);
        if (cached !== null && cached !== undefined) {
          if (cached === false) {
            logger.debug({ dnsName }, 'App.getIp: found in negative cache');
            return {
              result: false,
              answerSource: {
                'masked-dns': null, // Кеш не хранит информацию о маске
                'real-source': 'cache'
              }
            };
          }
          logger.debug({ dnsName, answers: cached }, 'App.getIp: found in cache');
          // Для кеша нужно определить masked-dns по dnsName
          const matchedMask = this.findMatchingMask(dnsName);
          return {
            result: cached,
            answerSource: {
              'masked-dns': matchedMask?.chainName ?? null,
              'real-source': 'cache'
            }
          };
        }
        logger.debug({ dnsName }, 'App.getIp: not found in cache');
      }

      // 3. Перебираем маски из masked-dns в порядке их указания в файле
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

          // Сохраняем в кеш после успешного запроса
          if (this.dnsCache && res.length > 0) {
            // Определяем минимальный TTL из всех ответов
            const minTtl = Math.min(...res.map(answer => answer.ttl ?? 300));
            this.dnsCache.set(dnsName, res, minTtl);
          }

          return {
            result: res,
            answerSource: {
              'masked-dns': chainName,
              'real-source': serverAddress // Формат "ip:port"
            }
          };
        }
        break;//@NOTE: проверяем только первую цепочку по маске
      }

      // Если не найдено нигде, сохраняем отрицательный кеш
      if (this.dnsCache) {
        this.dnsCache.setNegative(dnsName);
      }

      logger.debug({ dnsName }, 'App.getIp: not found at all');
      return {
        result: false,
        answerSource: {
          'masked-dns': null,
          'real-source': 'cache' // Отрицательный кеш
        }
      };
    } finally {
      logger.trace('App.getIp:END');
    }
  }

  /**
   * Найти соответствующую маску для DNS имени
   * Используется для определения masked-dns при ответе из кеша
   */
  protected findMatchingMask(dnsName: string): { mask: string; chainName: string } | null {
    for (const [mask, chainName] of this.options.maskedDns.entries()) {
      if (this.matchDnsMask(dnsName, mask)) {
        return { mask, chainName };
      }
    }
    return null;
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
        logger.debug({ dnsName, targetIp }, 'App.getIpLocal: found in local hosts list');
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
