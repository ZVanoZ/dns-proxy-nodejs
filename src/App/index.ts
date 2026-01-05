import type {OptionsInterface} from "./Options/index.js";
import {Options} from "./Options/index.js";
import type {Socket, RemoteInfo} from "node:dgram";
import dgram from "node:dgram";

export {
  Options
}

export class App
{
  protected isReady: boolean = false;
  protected socket!: Socket;

  protected options!: OptionsInterface;

  constructor()
  {
    this.options = new Options();
  }

  public setOptions(
    options: OptionsInterface
  ): void
  {
    this.options = options;
  }

  public async run()
  {
    console.log('App.run');
    this.initSocket();
  }

  protected initSocket(): void
  {
    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', this.onSocketError.bind(this));
    this.socket.on('message', this.onSocketMessage.bind(this));
    this.socket.bind(
      this.options.bindPort,
      this.options.bindHost,
      this.onSocketBind.bind(this)
    );
  }

  async onSocketBind()
  {

    console.log(`DNS Прокси запущен на ${this.options.bindHost}:${this.options.bindPort}`);
  }

  async onSocketError(error: Error)
  {
    if (error.message.includes('EADDRINUSE')) {
      console.error(`Ошибка: Порт ${this.options.bindPort} уже занят другим процессом.`);
      console.error(`Используйте другой порт в конфигурации или остановите процесс, использующий этот порт.`);
    } else {
      console.error(`Ошибка сервера:\n${error.stack}`);
    }
    this.socket.close();
  }

  async onSocketMessage(msg: Buffer, rinfo: RemoteInfo)
  {
    console.debug('-- message:BEG: [msg, rinfo]', [msg, rinfo]);
    try{

    }finally{
      console.debug('-- message:END: [msg, rinfo]', [msg, rinfo]);
    }
  }
}