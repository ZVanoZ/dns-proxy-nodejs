import { describe, test, expect } from '@jest/globals';
import dgram from 'node:dgram';
import { dnsPacket } from '../src/_dependencies.js';
import { loadTestOptions } from '../src/Test/index.js';

describe('DNS Server Availability Test', () => {
  test('should be accessible', async () => {
    const testOptions = await loadTestOptions();
    const testDomain = testOptions.testDomains[0] || 'google.com';

    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const client = dgram.createSocket('udp4');
      let resolved = false;

      const query = dnsPacket.encode({
        type: 'query',
        id: Math.floor(Math.random() * 65534),
        flags: dnsPacket.RECURSION_DESIRED,
        questions: [{
          type: 'A',
          name: testDomain,
        }],
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
            const response = dnsPacket.decode(msg);
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
          resolve({
            success: false,
            error: err.message,
          });
        }
      });

      client.send(
        query,
        testOptions.dnsServerPort,
        testOptions.dnsServerHost,
        (err) => {
          if (err && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            client.close();
            resolve({
              success: false,
              error: err.message,
            });
          }
        }
      );
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(`DNS server is not accessible: ${result.error}`);
    }
  }, 10000); // 10 секунд таймаут для теста
});
