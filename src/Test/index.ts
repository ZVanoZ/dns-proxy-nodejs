export interface TestOptions {
  dnsServerHost: string;
  dnsServerPort: number;
  requestsPerSecond: number;
  loadTestDuration: number;
  testDomains: string[];
}

export { loadTestOptions } from "./TestOptionsLoader.js";
