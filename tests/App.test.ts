import { describe, test, expect } from '@jest/globals';
import dgram from 'node:dgram';
import { dnsPacket } from '../src/_dependencies.js';
import { loadTestOptions } from '../src/Test/index.js';

function sendDnsQuery(
  host: string,
  port: number,
  family: 'udp4' | 'udp6',
  testDomain: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const client = dgram.createSocket(family);
    let resolved = false;

    const query = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65534),
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ type: 'A', name: testDomain }],
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.close();
        resolve({ success: false, error: 'Timeout: No response received' });
      }
    }, 2000);

    client.on('message', (msg) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        try {
          dnsPacket.decode(msg);
          client.close();
          resolve({ success: true });
        } catch (error) {
          client.close();
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to decode response',
          });
        }
      }
    });

    client.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        client.close();
        resolve({ success: false, error: err.message });
      }
    });

    client.send(query, port, host, (err) => {
      if (err && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        client.close();
        resolve({ success: false, error: err.message });
      }
    });
  });
}

describe('DNS Server Availability Test', () => {
  test('should be accessible via IPv4', async () => {
    const testOptions = await loadTestOptions();
    const testDomain = testOptions.testDomains[0] || 'google.com';

    const result = await sendDnsQuery(
      testOptions.v4DnsServerHost,
      testOptions.dnsServerPort,
      'udp4',
      testDomain
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(`DNS server is not accessible via IPv4: ${result.error}`);
    }
  }, 10000);

  test('should be accessible via IPv6 when v6DnsServerHost is configured', async () => {
    const testOptions = await loadTestOptions();
    if (!testOptions.v6DnsServerHost) {
      return; // Пропуск: IPv6-адрес для теста не задан в test.config.ini
    }
    const testDomain = testOptions.testDomains[0] || 'google.com';

    const result = await sendDnsQuery(
      testOptions.v6DnsServerHost,
      testOptions.dnsServerPort,
      'udp6',
      testDomain
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(`DNS server is not accessible via IPv6: ${result.error}`);
    }
  }, 10000);
});
