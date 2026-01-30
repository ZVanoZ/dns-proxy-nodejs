export interface TestOptions {
  /** Адрес DNS-сервера для тестов по IPv4. */
  v4DnsServerHost: string;
  /** Адрес DNS-сервера для тестов по IPv6 (опционально). Например ::1 */
  v6DnsServerHost?: string;
  /** Порт DNS-сервера (общий для IPv4 и IPv6). */
  dnsServerPort: number;
  requestsPerSecond: number;
  loadTestDuration: number;
  testDomains: string[];
}

export { loadTestOptions } from "./TestOptionsLoader.js";
