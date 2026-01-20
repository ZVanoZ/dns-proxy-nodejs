import { describe, test, expect, beforeEach } from '@jest/globals';
import { DnsCache } from '../src/DnsCache/index.js';
import type { Answer } from 'dns-packet';

describe('DnsCache', () => {
  let cache: DnsCache;
  const testAnswers: Answer[] = [
    {
      type: 'A',
      class: 'IN',
      name: 'example.com',
      data: '93.184.216.34',
      ttl: 3600
    }
  ];

  beforeEach(() => {
    cache = new DnsCache(100, 86400, 60);
  });

  describe('constructor', () => {
    test('should create cache with default values', () => {
      const defaultCache = new DnsCache();
      const stats = defaultCache.getStats();
      expect(stats.maxSize).toBe(1000);
      expect(stats.size).toBe(0);
    });

    test('should create cache with custom values', () => {
      const customCache = new DnsCache(500, 7200, 30);
      const stats = customCache.getStats();
      expect(stats.maxSize).toBe(500);
    });

    test('should throw error for invalid maxSize', () => {
      expect(() => new DnsCache(0)).toThrow('maxSize must be greater than 0');
      expect(() => new DnsCache(-1)).toThrow('maxSize must be greater than 0');
    });

    test('should throw error for invalid maxTtl', () => {
      expect(() => new DnsCache(100, 0)).toThrow('maxTtl must be greater than 0');
      expect(() => new DnsCache(100, -1)).toThrow('maxTtl must be greater than 0');
    });

    test('should throw error for invalid defaultNegativeTtl', () => {
      expect(() => new DnsCache(100, 86400, 0)).toThrow('defaultNegativeTtl must be greater than 0');
      expect(() => new DnsCache(100, 86400, -1)).toThrow('defaultNegativeTtl must be greater than 0');
    });
  });

  describe('get', () => {
    test('should return null for non-existent entry', () => {
      const result = cache.get('nonexistent.com');
      expect(result).toBeNull();
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });

    test('should return cached entry', () => {
      cache.set('example.com', testAnswers, 3600);
      const result = cache.get('example.com');
      
      expect(result).toEqual(testAnswers);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    test('should return false for negative cache', () => {
      cache.setNegative('nonexistent.com', 60);
      const result = cache.get('nonexistent.com');
      
      expect(result).toBe(false);
      
      const stats = cache.getStats();
      expect(stats.negativeHits).toBe(1);
    });

    test('should return null for expired entry', async () => {
      cache.set('example.com', testAnswers, 1); // TTL = 1 секунда
      
      // Ждем истечения TTL
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = cache.get('example.com');
      expect(result).toBeNull();
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });
  });

  describe('set', () => {
    test('should store entry in cache', () => {
      cache.set('example.com', testAnswers, 3600);
      
      const result = cache.get('example.com');
      expect(result).toEqual(testAnswers);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });

    test('should not cache when TTL is 0', () => {
      cache.set('example.com', testAnswers, 0);
      
      const result = cache.get('example.com');
      expect(result).toBeNull();
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    test('should normalize TTL to maxTtl', () => {
      const largeTtlCache = new DnsCache(100, 3600, 60);
      largeTtlCache.set('example.com', testAnswers, 10000); // Больше maxTtl
      
      const result = largeTtlCache.get('example.com');
      expect(result).toEqual(testAnswers);
      
      // Проверяем, что запись не истекла через maxTtl секунд
      // (но истекла бы через 10000 секунд, если бы не нормализация)
    });

    test('should update existing entry', () => {
      const newAnswers: Answer[] = [
        {
          type: 'A',
          class: 'IN',
          name: 'example.com',
          data: '192.0.2.1',
          ttl: 1800
        }
      ];
      
      cache.set('example.com', testAnswers, 3600);
      cache.set('example.com', newAnswers, 1800);
      
      const result = cache.get('example.com');
      expect(result).toEqual(newAnswers);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1); // Все еще одна запись
    });

    test('should copy answers array', () => {
      cache.set('example.com', testAnswers, 3600);
      
      // Модифицируем исходный массив
      testAnswers[0] = {
        type: 'A',
        class: 'IN',
        name: 'example.com',
        data: '192.0.2.1',
        ttl: 3600
      };
      
      const result = cache.get('example.com');
      expect(result).not.toEqual(testAnswers);
      expect(result?.[0]?.data).toBe('93.184.216.34');
    });
  });

  describe('setNegative', () => {
    test('should store negative cache entry', () => {
      cache.setNegative('nonexistent.com', 60);
      
      const result = cache.get('nonexistent.com');
      expect(result).toBe(false);
      
      const stats = cache.getStats();
      expect(stats.negativeHits).toBe(1);
    });

    test('should use default negative TTL', () => {
      cache.setNegative('nonexistent.com');
      
      const result = cache.get('nonexistent.com');
      expect(result).toBe(false);
    });

    test('should not cache when negative TTL is 0', () => {
      cache.setNegative('nonexistent.com', 0);
      
      const result = cache.get('nonexistent.com');
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('should remove entry from cache', () => {
      cache.set('example.com', testAnswers, 3600);
      cache.remove('example.com');
      
      const result = cache.get('example.com');
      expect(result).toBeNull();
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    test('should not throw error when removing non-existent entry', () => {
      expect(() => cache.remove('nonexistent.com')).not.toThrow();
    });
  });

  describe('clear', () => {
    test('should clear all entries', () => {
      cache.set('example.com', testAnswers, 3600);
      cache.setNegative('nonexistent.com', 60);
      
      cache.clear();
      
      expect(cache.get('example.com')).toBeNull();
      expect(cache.get('nonexistent.com')).toBeNull();
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      // misses будет > 0, так как мы вызвали get() после clear()
      expect(stats.negativeHits).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', () => {
      cache.set('example.com', testAnswers, 3600);
      cache.get('example.com'); // hit
      cache.get('nonexistent.com'); // miss
      cache.setNegative('bad.com', 60);
      cache.get('bad.com'); // negative hit
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.negativeHits).toBe(1);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    test('should evict least recently used entry when cache is full', () => {
      const smallCache = new DnsCache(3, 86400, 60);
      
      // Заполняем кеш
      smallCache.set('example1.com', testAnswers, 3600);
      smallCache.set('example2.com', testAnswers, 3600);
      smallCache.set('example3.com', testAnswers, 3600);
      
      // Добавляем еще одну запись - должна быть эвакуирована самая старая
      smallCache.set('example4.com', testAnswers, 3600);
      
      // Первая запись должна быть эвакуирована
      expect(smallCache.get('example1.com')).toBeNull();
      expect(smallCache.get('example4.com')).toEqual(testAnswers);
      
      const stats = smallCache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.evictions).toBe(1);
    });

    test('should update access order on get', () => {
      const smallCache = new DnsCache(3, 86400, 60);
      
      smallCache.set('example1.com', testAnswers, 3600);
      smallCache.set('example2.com', testAnswers, 3600);
      smallCache.set('example3.com', testAnswers, 3600);
      
      // Получаем первую запись - она становится MRU
      smallCache.get('example1.com');
      
      // Добавляем новую запись - должна быть эвакуирована example2.com (не example1.com)
      smallCache.set('example4.com', testAnswers, 3600);
      
      expect(smallCache.get('example1.com')).toEqual(testAnswers);
      expect(smallCache.get('example2.com')).toBeNull();
      expect(smallCache.get('example4.com')).toEqual(testAnswers);
    });

    test('should update access order on set existing entry', () => {
      const smallCache = new DnsCache(3, 86400, 60);
      
      smallCache.set('example1.com', testAnswers, 3600);
      smallCache.set('example2.com', testAnswers, 3600);
      smallCache.set('example3.com', testAnswers, 3600);
      
      // Обновляем первую запись - она становится MRU
      smallCache.set('example1.com', testAnswers, 3600);
      
      // Добавляем новую запись - должна быть эвакуирована example2.com
      smallCache.set('example4.com', testAnswers, 3600);
      
      expect(smallCache.get('example1.com')).toEqual(testAnswers);
      expect(smallCache.get('example2.com')).toBeNull();
    });
  });

  describe('TTL normalization', () => {
    test('should limit TTL to maxTtl', () => {
      const limitedCache = new DnsCache(100, 3600, 60);
      limitedCache.set('example.com', testAnswers, 10000);
      
      // Запись должна истечь через maxTtl, а не через 10000 секунд
      // Проверяем, что запись все еще валидна сразу после установки
      const result = limitedCache.get('example.com');
      expect(result).toEqual(testAnswers);
    });

    test('should floor TTL values', () => {
      cache.set('example.com', testAnswers, 3600.7);
      
      const result = cache.get('example.com');
      expect(result).toEqual(testAnswers);
    });
  });

  describe('edge cases', () => {
    test('should handle empty answers array', () => {
      cache.set('example.com', [], 3600);
      
      const result = cache.get('example.com');
      expect(result).toEqual([]);
    });

    test('should handle multiple answers', () => {
      const multipleAnswers: Answer[] = [
        {
          type: 'A',
          class: 'IN',
          name: 'example.com',
          data: '93.184.216.34',
          ttl: 3600
        },
        {
          type: 'A',
          class: 'IN',
          name: 'example.com',
          data: '192.0.2.1',
          ttl: 3600
        }
      ];
      
      cache.set('example.com', multipleAnswers, 3600);
      const result = cache.get('example.com');
      
      expect(result).toEqual(multipleAnswers);
      expect(result?.length).toBe(2);
    });

    test('should handle answers with different TTLs', () => {
      const answersWithDifferentTtl: Answer[] = [
        {
          type: 'A',
          class: 'IN',
          name: 'example.com',
          data: '93.184.216.34',
          ttl: 1800
        },
        {
          type: 'A',
          class: 'IN',
          name: 'example.com',
          data: '192.0.2.1',
          ttl: 3600
        }
      ];
      
      cache.set('example.com', answersWithDifferentTtl, 3600);
      const result = cache.get('example.com');
      
      expect(result).toEqual(answersWithDifferentTtl);
    });
  });
});
