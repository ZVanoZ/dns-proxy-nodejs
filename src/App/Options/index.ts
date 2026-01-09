export type HostsMap = Map<string, string>;
export type UpstreamDnsChains = Map<string, string[]>; // Название цепочки -> массив IP:PORT
export type MaskedDnsMap = Map<string, string>; // Маска DNS -> название цепочки

export interface OptionsInterface {
  bindHost: string;
  bindPort: number;
  hosts: HostsMap;
  upstreamDnsChains: UpstreamDnsChains; // Именованные цепочки DNS-серверов
  maskedDns: MaskedDnsMap; // Маски DNS-имен -> названия цепочек
}

export class Options implements OptionsInterface {
  bindHost: string = '0.0.0.0';
  bindPort: number = 53;
  hosts: HostsMap = new Map();
  upstreamDnsChains: UpstreamDnsChains = new Map();
  maskedDns: MaskedDnsMap = new Map();
}