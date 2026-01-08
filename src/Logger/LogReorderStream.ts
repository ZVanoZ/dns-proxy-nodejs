import { Transform } from 'node:stream';

/**
 * Stream для перестановки полей в JSON логах в нужном порядке:
 * 1. level
 * 2. time
 * 3. pid
 * 4. hostname
 * 5. msg
 * 6. context (все остальные поля)
 */
export class LogReorderStream extends Transform {
  constructor() {
    super({
      objectMode: false,
      writableObjectMode: false,
      readableObjectMode: false,
    });
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    try {
      const chunkStr = chunk.toString('utf8').trim();
      if (!chunkStr) {
        callback();
        return;
      }

      // Парсим JSON строку
      const logObj = JSON.parse(chunkStr);
      
      // Переставляем поля в нужном порядке
      const reordered: any = {};

      // 1. level
      if (logObj.level !== undefined) {
        reordered.level = logObj.level;
      }

      // 2. time
      if (logObj.time !== undefined) {
        reordered.time = logObj.time;
      }

      // 3. pid
      if (logObj.pid !== undefined) {
        reordered.pid = logObj.pid;
      }

      // 4. hostname
      if (logObj.hostname !== undefined) {
        reordered.hostname = logObj.hostname;
      }

      // 5. msg
      if (logObj.msg !== undefined) {
        reordered.msg = logObj.msg;
      }

      // 6. context (все остальные поля кроме уже обработанных)
      const processedKeys = new Set(['level', 'time', 'pid', 'hostname', 'msg']);
      for (const key in logObj) {
        if (!processedKeys.has(key)) {
          reordered[key] = logObj[key];
        }
      }

      // Преобразуем обратно в JSON строку
      const output = JSON.stringify(reordered) + '\n';
      this.push(Buffer.from(output, 'utf8'));
    } catch (err) {
      // В случае ошибки передаем оригинальный chunk
      this.push(chunk);
    }
    
    callback();
  }
}
