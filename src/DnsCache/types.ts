import type { Answer } from '../_dependencies.js';

/**
 * Запись в кеше DNS
 */
export interface CacheEntry {
  /**
   * DNS ответы (массив Answer из dns-packet)
   */
  answers: Answer[];

  /**
   * Время кеширования в миллисекундах (timestamp)
   */
  cachedAt: number;

  /**
   * TTL в секундах (из ответа DNS или конфигурации)
   */
  ttl: number;

  /**
   * Флаг отрицательного кеша (true для NXDOMAIN)
   */
  isNegative: boolean;
}

/**
 * Статистика использования кеша
 */
export interface CacheStats {
  /**
   * Текущее количество записей в кеше
   */
  size: number;

  /**
   * Максимальный размер кеша
   */
  maxSize: number;

  /**
   * Количество попаданий в кеш (cache hits)
   */
  hits: number;

  /**
   * Количество промахов кеша (cache misses)
   */
  misses: number;

  /**
   * Количество попаданий в отрицательный кеш
   */
  negativeHits: number;

  /**
   * Количество эвакуированных записей (LRU evictions)
   */
  evictions: number;
}

/**
 * Интерфейс кеша DNS
 */
export interface DnsCacheInterface {
  /**
   * Получить запись из кеша
   * @param dnsName - DNS имя для поиска
   * @returns Массив Answer, false (отрицательный кеш), или null (нет в кеше)
   */
  get(dnsName: string): Answer[] | false | null;

  /**
   * Сохранить положительный ответ в кеш
   * @param dnsName - DNS имя
   * @param answers - Массив DNS ответов
   * @param ttl - TTL в секундах (из ответа DNS)
   */
  set(dnsName: string, answers: Answer[], ttl: number): void;

  /**
   * Сохранить отрицательный ответ в кеш (NXDOMAIN)
   * @param dnsName - DNS имя
   * @param negativeTtl - TTL для отрицательного кеша (обычно короткий, например 60 сек)
   */
  setNegative(dnsName: string, negativeTtl?: number): void;

  /**
   * Очистить весь кеш
   */
  clear(): void;

  /**
   * Получить статистику использования кеша
   */
  getStats(): CacheStats;

  /**
   * Удалить конкретную запись из кеша
   * @param dnsName - DNS имя для удаления
   */
  remove(dnsName: string): void;
}
