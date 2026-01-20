import type { Answer } from '../_dependencies.js';
import type { CacheEntry, CacheStats, DnsCacheInterface } from './types.js';

/**
 * Кеш DNS запросов с поддержкой LRU (Least Recently Used) эвакуации
 * 
 * Особенности:
 * - In-memory кеш с ограничением размера
 * - Автоматическая эвакуация старых записей при переполнении (LRU)
 * - Учет TTL из DNS ответов
 * - Отрицательное кеширование (NXDOMAIN)
 * - Статистика использования
 */
export class DnsCache implements DnsCacheInterface {
  /**
   * Основное хранилище кеша: DNS имя -> CacheEntry
   */
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Порядок доступа для LRU: массив DNS имен в порядке последнего использования
   * Первый элемент - самый старый (Least Recently Used)
   * Последний элемент - самый новый (Most Recently Used)
   */
  private accessOrder: string[] = [];

  /**
   * Максимальный размер кеша (количество записей)
   */
  private readonly maxSize: number;

  /**
   * Максимальный TTL в секундах (защита от очень больших TTL)
   */
  private readonly maxTtl: number;

  /**
   * TTL по умолчанию для отрицательного кеша (NXDOMAIN)
   */
  private readonly defaultNegativeTtl: number;

  /**
   * Статистика использования кеша
   */
  private stats: {
    hits: number;
    misses: number;
    negativeHits: number;
    evictions: number;
  } = {
      hits: 0,
      misses: 0,
      negativeHits: 0,
      evictions: 0
    };

  /**
   * @param maxSize - Максимальный размер кеша (по умолчанию 1000)
   * @param maxTtl - Максимальный TTL в секундах (по умолчанию 86400 = 24 часа)
   * @param defaultNegativeTtl - TTL для отрицательного кеша (по умолчанию 60 секунд)
   */
  constructor(
    maxSize: number = 1000,
    maxTtl: number = 86400,
    defaultNegativeTtl: number = 60
  ) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be greater than 0');
    }
    if (maxTtl <= 0) {
      throw new Error('maxTtl must be greater than 0');
    }
    if (defaultNegativeTtl <= 0) {
      throw new Error('defaultNegativeTtl must be greater than 0');
    }

    this.maxSize = maxSize;
    this.maxTtl = maxTtl;
    this.defaultNegativeTtl = defaultNegativeTtl;
  }

  /**
   * Получить запись из кеша
   * 
   * Алгоритм:
   * 1. Проверка существования записи
   * 2. Проверка истечения TTL
   * 3. Обновление порядка доступа (LRU)
   * 4. Обновление статистики
   * 5. Возврат результата
   */
  get(dnsName: string): Answer[] | false | null {
    const entry = this.cache.get(dnsName);

    // Запись не найдена
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Проверка истечения TTL
    if (this.isExpired(entry)) {
      // Удаляем истекшую запись
      this.remove(dnsName);
      this.stats.misses++;
      return null;
    }

    // Обновляем порядок доступа (LRU): перемещаем в конец (Most Recently Used)
    this.updateAccessOrder(dnsName);

    // Обновляем статистику
    if (entry.isNegative) {
      this.stats.negativeHits++;
      return false;
    } else {
      this.stats.hits++;
      return entry.answers;
    }
  }

  /**
   * Сохранить положительный ответ в кеш
   * 
   * Алгоритм:
   * 1. Нормализация TTL (ограничение максимальным значением)
   * 2. Проверка размера кеша и эвакуация LRU при необходимости
   * 3. Создание записи
   * 4. Сохранение в кеш
   * 5. Обновление порядка доступа
   */
  set(dnsName: string, answers: Answer[], ttl: number): void {
    // Нормализация TTL
    const normalizedTtl = this.normalizeTtl(ttl);

    // Если TTL = 0, не кешируем
    if (normalizedTtl === 0) {
      return;
    }

    // Проверка размера и эвакуация при необходимости
    if (this.cache.size >= this.maxSize && !this.cache.has(dnsName)) {
      this.evictLRU();
    }

    // Создание записи
    const entry: CacheEntry = {
      answers: [...answers], // Копируем массив для безопасности
      cachedAt: Date.now(),
      ttl: normalizedTtl,
      isNegative: false
    };

    // Сохранение в кеш
    const wasExisting = this.cache.has(dnsName);
    this.cache.set(dnsName, entry);

    // Обновление порядка доступа
    if (wasExisting) {
      // Если запись уже существовала, обновляем порядок
      this.updateAccessOrder(dnsName);
    } else {
      // Если новая запись, добавляем в конец
      this.accessOrder.push(dnsName);
    }
  }

  /**
   * Сохранить отрицательный ответ в кеш (NXDOMAIN)
   */
  setNegative(dnsName: string, negativeTtl?: number): void {
    const ttl = negativeTtl ?? this.defaultNegativeTtl;
    const normalizedTtl = this.normalizeTtl(ttl);

    // Если TTL = 0, не кешируем
    if (normalizedTtl === 0) {
      return;
    }

    // Проверка размера и эвакуация при необходимости
    if (this.cache.size >= this.maxSize && !this.cache.has(dnsName)) {
      this.evictLRU();
    }

    // Создание отрицательной записи
    const entry: CacheEntry = {
      answers: [],
      cachedAt: Date.now(),
      ttl: normalizedTtl,
      isNegative: true
    };

    // Сохранение в кеш
    const wasExisting = this.cache.has(dnsName);
    this.cache.set(dnsName, entry);

    // Обновление порядка доступа
    if (wasExisting) {
      this.updateAccessOrder(dnsName);
    } else {
      this.accessOrder.push(dnsName);
    }
  }

  /**
   * Удалить конкретную запись из кеша
   */
  remove(dnsName: string): void {
    this.cache.delete(dnsName);
    // Удаляем из порядка доступа
    const index = this.accessOrder.indexOf(dnsName);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Очистить весь кеш
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    // Сбрасываем статистику
    this.stats = {
      hits: 0,
      misses: 0,
      negativeHits: 0,
      evictions: 0
    };
  }

  /**
   * Получить статистику использования кеша
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      negativeHits: this.stats.negativeHits,
      evictions: this.stats.evictions
    };
  }

  /**
   * Проверить, истекла ли запись (TTL)
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const expiresAt = entry.cachedAt + (entry.ttl * 1000);
    return now >= expiresAt;
  }

  /**
   * Нормализовать TTL (ограничить максимальным значением)
   */
  private normalizeTtl(ttl: number): number {
    if (ttl <= 0) {
      return 0;
    }
    if (ttl > this.maxTtl) {
      return this.maxTtl;
    }
    return Math.floor(ttl);
  }

  /**
   * Обновить порядок доступа для LRU
   * Перемещает элемент в конец массива (Most Recently Used)
   */
  private updateAccessOrder(dnsName: string): void {
    const index = this.accessOrder.indexOf(dnsName);
    if (index !== -1) {
      // Удаляем из текущей позиции
      this.accessOrder.splice(index, 1);
    }
    // Добавляем в конец (Most Recently Used)
    this.accessOrder.push(dnsName);
  }

  /**
   * Эвакуировать самую старую запись (Least Recently Used)
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    // Первый элемент - самый старый (Least Recently Used)
    const lruKey = this.accessOrder[0];
    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.shift(); // Удаляем первый элемент
      this.stats.evictions++;
    }
  }
}
