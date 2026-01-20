import type { Answer } from '../_dependencies.js';

/**
 * Источник ответа DNS
 */
export interface AnswerSource {
  /**
   * Значение из секции [masked-dns] конфига (chainName)
   * null если не применимо (например, для hosts или cache без маски)
   */
  'masked-dns': string | null;

  /**
   * Реальный источник ответа:
   * - "cache" - если взято из кеша
   * - "hosts" - если значение взято из секции [hosts]
   * - "ip:port" - upstream DNS сервер, если было обращение к внешнему серверу
   */
  'real-source': 'cache' | 'hosts' | string; // string для формата "ip:port"
}

/**
 * Результат поиска IP с информацией об источнике
 */
export interface IpLookupResult {
  /**
   * Результат поиска: IP адрес(а), массив Answer, или false
   */
  result: string | string[] | Answer[] | false;

  /**
   * Информация об источнике ответа
   */
  answerSource: AnswerSource;
}
