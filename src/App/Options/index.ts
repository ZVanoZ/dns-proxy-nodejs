export type HostsMap = Map<string, string>;
export type UpstreamDnsChains = Map<string, string[]>; // Название цепочки -> массив IP:PORT
export type MaskedDnsMap = Map<string, string>; // Маска DNS -> название цепочки

/**
 * Настройки кеша DNS
 */
export interface DnsCacheOptions {
  /**
   * Включить/выключить кеширование
   */
  enabled: boolean;
  
  /**
   * Максимальный размер кеша (количество записей)
   */
  maxSize: number;
  
  /**
   * Максимальный TTL в секундах (защита от очень больших TTL)
   */
  maxTtl: number;
  
  /**
   * TTL для отрицательного кеша (NXDOMAIN) в секундах
   */
  negativeTtl: number;
}

export interface OptionsInterface {
  bindHost: string;
  bindPort: number;
  hosts: HostsMap;
  upstreamDnsChains: UpstreamDnsChains; // Именованные цепочки DNS-серверов
  maskedDns: MaskedDnsMap; // Маски DNS-имен -> названия цепочек
  dnsCache?: DnsCacheOptions; // Настройки кеша DNS
}

export class Options implements OptionsInterface {
  bindHost: string = '0.0.0.0';
  bindPort: number = 53;
  hosts: HostsMap = new Map();
  upstreamDnsChains: UpstreamDnsChains = new Map();
  maskedDns: MaskedDnsMap = new Map();
  dnsCache?: DnsCacheOptions;
}