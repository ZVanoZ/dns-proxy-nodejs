import pino from 'pino';
import type { Logger } from 'pino';
import { LogRotationService } from './LogRotationService.js';

/**
 * Wrapper для Pino logger с автоматической ротацией файлов
 * Проверяет дату при каждом вызове методов логирования
 */
export class RotatingLogger {
  private baseLogger: Logger;
  private rotationService: LogRotationService;
  private logDir: string;
  private logLevel: string;
  private isPretty: boolean;
  private lastRotationCheck: number = 0;
  private readonly ROTATION_CHECK_INTERVAL = 60000; // Проверяем каждую минуту
  private proxy: Logger;

  constructor(
    baseLogger: Logger,
    rotationService: LogRotationService,
    logDir: string,
    logLevel: string,
    isPretty: boolean
  ) {
    this.baseLogger = baseLogger;
    this.rotationService = rotationService;
    this.logDir = logDir;
    this.logLevel = logLevel;
    this.isPretty = isPretty;
    this.lastRotationCheck = Date.now();

    // Создаем Proxy для автоматического проксирования всех методов
    this.proxy = new Proxy(this, {
      get: (target, prop) => {
        // Методы логирования - с проверкой ротации
        if (['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop as string)) {
          return (...args: any[]) => {
            target.checkAndRotate();
            return (target.baseLogger as any)[prop](...args);
          };
        }
        // Остальные свойства и методы - напрямую из baseLogger
        const value = (target.baseLogger as any)[prop];
        if (typeof value === 'function') {
          return value.bind(target.baseLogger);
        }
        return value;
      },
      set: (target, prop, value) => {
        (target.baseLogger as any)[prop] = value;
        return true;
      }
    }) as Logger;
  }

  /**
   * Получить проксированный logger
   */
  getLogger(): Logger {
    return this.proxy;
  }

  /**
   * Проверить и выполнить ротацию если нужно
   * Оптимизировано: проверяет дату не чаще чем раз в минуту
   */
  checkAndRotate(): void {
    const now = Date.now();
    // Проверяем не чаще чем раз в минуту для оптимизации
    if (now - this.lastRotationCheck < this.ROTATION_CHECK_INTERVAL) {
      return;
    }

    this.lastRotationCheck = now;

    if (this.rotationService.shouldRotate()) {
      this.performRotation();
    }
  }

  /**
   * Выполнить ротацию - пересоздать logger с новым файлом
   */
  private performRotation(): void {
    try {
      // Обновляем дату в сервисе
      this.rotationService.updateCurrentDate();

      // Получаем новый файл
      const newLogFile = this.rotationService.getCurrentLogFile();

      // Настраиваем транспорты
      const targets: pino.TransportTargetOptions[] = [
        // Файл - всегда JSON формат
        {
          target: 'pino/file',
          options: {
            destination: newLogFile,
            mkdir: true,
          },
          level: this.logLevel,
        },
      ];

      // Консоль - с pretty форматированием если нужно
      if (this.isPretty) {
        targets.push({
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
          level: this.logLevel,
        });
      } else {
        // Консоль без форматирования (JSON)
        targets.push({
          target: 'pino/file',
          options: {
            destination: 1, // stdout
          },
          level: this.logLevel,
        });
      }

      // Создаем новый транспорт
      const transport = pino.transport({
        targets,
      });

      // Создаем новый logger
      this.baseLogger = pino(
        {
          level: this.logLevel,
          timestamp: pino.stdTimeFunctions.isoTime,
        },
        transport
      );

      // Логируем факт ротации
      this.baseLogger.info('Ротация логов: переключение на новый файл');
    } catch (err) {
      // В случае ошибки продолжаем использовать старый logger
      console.error('Ошибка при ротации логов:', err);
    }
  }

}
