export type HostsMap = Map<string, string>;

export interface OptionsInterface {
  bindHost: string;
  bindPort: number;
  hosts: HostsMap;
  upstreamDnsList: string[];
}

export class Options implements OptionsInterface {
  bindHost: string = '0.0.0.0';
  bindPort: number = 53;
  hosts: HostsMap = new Map();
  upstreamDnsList: string[] = [];
}