import { promises as fs } from 'node:fs';
import { join } from 'node:path';

/**
 * Сервис для управления ротацией лог-файлов
 */
export class LogRotationService {
  private logDir: string;
  private currentDate: string;
  private retentionDays: number = 10;

  constructor(logDir: string, retentionDays: number = 10) {
    this.logDir = logDir;
    this.retentionDays = retentionDays;
    this.currentDate = this.getCurrentDateString();
  }

  /**
   * Получить имя файла лога для текущей даты
   */
  getCurrentLogFile(): string {
    return join(this.logDir, `app-log-${this.currentDate}.json`);
  }

  /**
   * Получить имя файла лога для указанной даты
   */
  getLogFileForDate(date: Date): string {
    const dateStr = this.formatDate(date);
    return join(this.logDir, `app-log-${dateStr}.json`);
  }

  /**
   * Проверить, нужно ли переключиться на новый файл
   */
  shouldRotate(): boolean {
    const today = this.getCurrentDateString();
    return today !== this.currentDate;
  }

  /**
   * Обновить текущую дату (вызывать при ротации)
   */
  updateCurrentDate(): void {
    this.currentDate = this.getCurrentDateString();
  }

  /**
   * Удалить старые лог-файлы (старше retentionDays дней)
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const deletePromises: Promise<void>[] = [];

      for (const file of files) {
        if (!file.startsWith('app-log-') || !file.endsWith('.json')) {
          continue;
        }

        // Извлечь дату из имени файла: app-log-YYYY-MM-DD.json
        const dateMatch = file.match(/app-log-(\d{4}-\d{2}-\d{2})\.json/);
        if (!dateMatch || !dateMatch[1]) {
          continue;
        }

        const fileDate = new Date(dateMatch[1]);
        if (fileDate < cutoffDate) {
          const filePath = join(this.logDir, file);
          deletePromises.push(
            fs.unlink(filePath).catch((err) => {
              console.error(`Ошибка при удалении файла ${filePath}:`, err);
            })
          );
        }
      }

      await Promise.all(deletePromises);
    } catch (err) {
      // Игнорируем ошибки при очистке, чтобы не прерывать работу приложения
      // Используем console.error так как logger может быть еще не инициализирован
      console.error('Ошибка при очистке старых логов:', err);
    }
  }

  /**
   * Убедиться, что директория логов существует
   */
  async ensureLogDirectory(): Promise<void> {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * Получить строку текущей даты в формате YYYY-MM-DD
   */
  private getCurrentDateString(): string {
    return this.formatDate(new Date());
  }

  /**
   * Форматировать дату в строку YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
