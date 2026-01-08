import pino from 'pino';
import type { Logger } from 'pino';
import { LogRotationService } from './LogRotationService.js';
import { RotatingLogger } from './RotatingLogger.js';
import { join } from 'node:path';

/**
 * Фабрика для создания настроенного logger'а
 */
export class LoggerFactory {
  private static logger: Logger | null = null;
  private static rotationService: LogRotationService | null = null;

  /**
   * Создать или получить существующий logger
   */
  static async create(): Promise<Logger> {
    if (this.logger) {
      return this.logger;
    }

    // Читаем переменные окружения
    const logDir = process.env.APP_LOG_DIR || './logs';
    const logLevel = (process.env.APP_LOG_LEVEL || 'info').toLowerCase();
    const isPretty = process.env.APP_LOG_IS_PRETTY === 'true' || process.env.APP_LOG_IS_PRETTY === '1';

    // Создаем сервис ротации
    this.rotationService = new LogRotationService(logDir, 10);

    // Убеждаемся, что директория существует
    await this.rotationService.ensureLogDirectory();

    // Очищаем старые логи при старте
    await this.rotationService.cleanupOldLogs();

    // Получаем путь к текущему файлу лога
    const logFile = this.rotationService.getCurrentLogFile();

    // Настраиваем транспорты
    const targets: pino.TransportTargetOptions[] = [
      // Файл - всегда JSON формат
      {
        target: 'pino/file',
        options: {
          destination: logFile,
          mkdir: true,
        },
        level: logLevel,
      },
    ];

    // Консоль - с pretty форматированием если нужно
    if (isPretty) {
      targets.push({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
        level: logLevel,
      });
    } else {
      // Консоль без форматирования (JSON)
      targets.push({
        target: 'pino/file',
        options: {
          destination: 1, // stdout
        },
        level: logLevel,
      });
    }

    // Создаем транспорт
    const transport = pino.transport({
      targets,
    });

    // Создаем базовый logger
    const baseLogger = pino(
      {
        level: logLevel,
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      transport
    );

    // Оборачиваем в RotatingLogger для автоматической ротации
    const rotatingLogger = new RotatingLogger(
      baseLogger,
      this.rotationService,
      logDir,
      logLevel,
      isPretty
    );

    this.logger = rotatingLogger.getLogger();

    return this.logger;
  }

  /**
   * Получить существующий logger (без создания нового)
   */
  static getLogger(): Logger | null {
    return this.logger;
  }


  /**
   * Получить сервис ротации (для тестирования)
   */
  static getRotationService(): LogRotationService | null {
    return this.rotationService;
  }
}
