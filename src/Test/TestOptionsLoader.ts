import * as fs from "node:fs/promises";
import * as ini from "ini";
import type { TestOptions } from "./index.js";

export async function loadTestOptions(iniPath: string = './config/test.config.ini'): Promise<TestOptions> {
  const options: TestOptions = {
    dnsServerHost: '127.0.0.1',
    dnsServerPort: 5053,
    requestsPerSecond: 40,
    loadTestDuration: 10,
    testDomains: ['google.com', 'github.com', 'example.com'],
  };

  try {
    const iniContent = await fs.readFile(iniPath, 'utf-8');
    const parsedIni = ini.parse(iniContent);

    // Загрузка опций из секции [test]
    if (parsedIni.test) {
      const testSection = parsedIni.test;

      if (testSection.dnsServerHost) {
        options.dnsServerHost = testSection.dnsServerHost;
      }

      if (testSection.dnsServerPort) {
        const port = parseInt(testSection.dnsServerPort, 10);
        if (!isNaN(port) && port > 0 && port < 65536) {
          options.dnsServerPort = port;
        } else {
          throw new Error(`Invalid port: ${testSection.dnsServerPort}`);
        }
      }

      if (testSection.requestsPerSecond) {
        const rps = parseInt(testSection.requestsPerSecond, 10);
        if (!isNaN(rps) && rps > 0) {
          options.requestsPerSecond = rps;
        } else {
          throw new Error(`Invalid requestsPerSecond: ${testSection.requestsPerSecond}`);
        }
      }

      if (testSection.loadTestDuration) {
        const duration = parseInt(testSection.loadTestDuration, 10);
        if (!isNaN(duration) && duration > 0) {
          options.loadTestDuration = duration;
        } else {
          throw new Error(`Invalid loadTestDuration: ${testSection.loadTestDuration}`);
        }
      }

      if (testSection.testDomains) {
        const domains = (testSection.testDomains as string)
          .split(',')
          .map(domain => domain.trim())
          .filter(domain => domain.length > 0);
        if (domains.length > 0) {
          options.testDomains = domains;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load test options from ${iniPath}: ${error.message}`);
    }
    throw error;
  }

  return options;
}
