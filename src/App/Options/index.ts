export type HostsMap = Map<string, string>;
export type UpstreamDnsRow = Map<number, string>;

export interface OptionsInterface {
  bindHost: string;
  bindPort: number;
  hosts: HostsMap;
  upstreamDnsList: UpstreamDnsRow[];
}

export class Options implements OptionsInterface {
  bindHost: string = '0.0.0.0';
  bindPort: number = 53;
  hosts: HostsMap = new Map();
  upstreamDnsList: UpstreamDnsRow[] = [];
}