import { dnsPacket } from "../_dependencies.js";
import {
  dnsPacket as dnsPacketModule
} from "../_dependencies.js";

import type { OptionsInterface } from "./Options/index.js";
import { Options } from "./Options/index.js";
import type { Socket, RemoteInfo } from "node:dgram";
import dgram from "node:dgram";
import type { DecodedPacket } from "dns-packet";


export {
  Options
}

export class App {
  protected isReady: boolean = false;
  protected socket!: Socket;

  protected options!: OptionsInterface;

  constructor() {
    this.options = new Options();
  }

  public setOptions(
    options: OptionsInterface
  ): void {
    this.options = options;
  }

  public async run() {
    console.log('App.run');
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
    console.log(`DNS Прокси запущен на ${this.options.bindHost}:${this.options.bindPort}`);
  }

  async onSocketError(error: Error) {
    if (error.message.includes('EADDRINUSE')) {
      console.error(`Ошибка: Порт ${this.options.bindPort} уже занят другим процессом.`);
      console.error(`Используйте другой порт в конфигурации или остановите процесс, использующий этот порт.`);
    } else {
      console.error(`Ошибка сервера:\n${error.stack}`);
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
    console.debug('-- message:BEG: [msg, rinfo]', [msg, remoteInfo]);
    try {

      let dnsRequest: dnsPacketModule.DecodedPacket;
      try {
        dnsRequest = dnsPacket.decode(msg);
      } catch (e) {
        console.error('Ошибка декодирования пакета:', e);
        this.sendErrorResponse(msg, remoteInfo);
        return;
      }

      console.debug('-- message:[dnsRequest]', [JSON.stringify(dnsRequest)]);

      const question: dnsPacketModule.Question | undefined = dnsRequest.questions?.[0];
      if (!question) {
        console.error('DNS запрос не содержит вопросов');
        this.sendErrorResponse(msg, remoteInfo);
        return;
      }
      const dnsName: string = question.name; // Имя DNS, которое запрашивается
      console.log(`Запрос: ${dnsName} от ${remoteInfo.address}`);

      const targetIp: string | string[] | dnsPacket.Answer[] | false = await this.getIp(dnsName);
      if (typeof targetIp === 'string' || Array.isArray(targetIp)) {
        this.sendSuccessResponse(dnsRequest, remoteInfo, targetIp);
        return;
      }

      this.sendErrorResponse(dnsRequest, remoteInfo);
    } finally {
      console.debug('-- message:END: [msg, rinfo]', [msg, remoteInfo]);
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
    console.debug('-- sendErrorResponse:BEG: [dnsRequest, rinfo]', [dnsRequest, remoteInfo]);
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
      const errResponse = dnsPacket.encode(response);

      this.socket.send(errResponse, remoteInfo.port, remoteInfo.address);
    } finally {
      console.debug('-- sendErrorResponse:END');
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

    console.debug('-- sendSuccessResponse:BEG: [response, rinfo]', [response, remoteInfo]);
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
      this.socket.send(dnsPacket.encode(response), remoteInfo.port, remoteInfo.address);
    } finally {
      console.debug('-- sendSuccessResponse:END');
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
    console.debug('-- getIp:BEG:[dnsName]', [dnsName]);
    try {
      let res = await this.getIpLocal(dnsName);
      if (res !== false) {
        return res;
      }
      for (const upstreamDns of this.options.upstreamDnsList) {
        const upstreamIp: any = upstreamDns.get(0);
        if (typeof upstreamIp === 'string') {
          const res: false | dnsPacket.Answer[] = await this.getIpUpstream(dnsName, upstreamIp);
          if (res !== false) {
            return res;
          }
        }
      }
      //res = await this.getIpUpstream(dnsName);
      return false;
    } finally {
      console.debug('-- getIp:END');
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
    console.debug('-- getIpLocal:BEG:[dnsName]', [dnsName]);
    try {
      const targetIp = this.options.hosts.get(dnsName);

      if (targetIp) {
        return targetIp;
      }
      return false;
    } finally {
      console.debug('-- getIpLocal:END');
    }
  }

  async getIpUpstream(
    dnsName: string,
    upstreamIp: string
  ): Promise<dnsPacket.Answer[] | false> {
    console.debug('-- getIpUpstream:BEG:[dnsName]', [dnsName]);
    try {

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
            53,
            upstreamIp,
            (err) => {
              if (err) {
                clearTimeout(timeout);
                client.close();
                resolve(false);
              }
            }
          );
        }
      );
      console.debug('-- getIpUpstream:[res]', [res]);
      return res;
    } finally {
      console.debug('-- getIpUpstream:END');
    }
  }

}
