import { describe, test, expect } from '@jest/globals';
import dgram from 'node:dgram';
import { dnsPacket } from '../src/_dependencies.js';
import { loadTestOptions } from '../src/Test/index.js';

interface RequestResult {
  success: boolean;
  responseTime: number;
  error?: string;
}

async function sendDnsQuery(
  host: string,
  port: number,
  domain: string,
  timeout: number = 2000
): Promise<RequestResult> {
  const startTime = Date.now();

  return new Promise<RequestResult>((resolve) => {
    const client = dgram.createSocket('udp4');
    let resolved = false;

    const query = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65534),
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{
        type: 'A',
        name: domain,
      }],
    });

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.close();
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          error: 'Timeout',
        });
      }
    }, timeout);

    client.on('message', (msg) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        try {
          const response = dnsPacket.decode(msg);
          const responseTime = Date.now() - startTime;
          client.close();
          resolve({
            success: response.answers && response.answers.length > 0,
            responseTime,
          });
        } catch (error) {
          client.close();
          resolve({
            success: false,
            responseTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Failed to decode response',
          });
        }
      }
    });

    client.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        client.close();
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          error: err.message,
        });
      }
    });

    client.send(query, port, host, (err) => {
      if (err && !resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        client.close();
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          error: err.message,
        });
      }
    });
  });
}

describe('DNS Server Load Test', () => {
  test('should handle load test', async () => {
    const testOptions = await loadTestOptions();
    const { dnsServerHost, dnsServerPort, requestsPerSecond, loadTestDuration, testDomains } = testOptions;

    const results: RequestResult[] = [];
    const startTime = Date.now();
    const endTime = startTime + (loadTestDuration * 1000);
    const interval = 1000 / requestsPerSecond; // Интервал между запросами в миллисекундах
    const totalExpectedRequests = requestsPerSecond * loadTestDuration;

    // Функция для отправки одного запроса (не ждем ответа, чтобы не блокировать)
    const sendRequestAsync = (domain: string): void => {
      sendDnsQuery(dnsServerHost, dnsServerPort, domain).then(result => {
        results.push(result);
      }).catch(error => {
        results.push({
          success: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    };

    // Отправляем запросы с заданной частотой
    let requestCount = 0;
    const sendRequests = (): void => {
      if (Date.now() >= endTime || requestCount >= totalExpectedRequests) {
        return;
      }

      const domain = testDomains[Math.floor(Math.random() * testDomains.length)] || testDomains[0];
      sendRequestAsync(domain);
      requestCount++;

      if (Date.now() < endTime && requestCount < totalExpectedRequests) {
        setTimeout(sendRequests, interval);
      }
    };

    // Запускаем отправку запросов
    sendRequests();

    // Ждем завершения теста и еще немного для получения всех ответов
    await new Promise(resolve => setTimeout(resolve, (loadTestDuration * 1000) + 5000));

    // Анализ результатов
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.filter(r => !r.success).length;
    const totalRequests = results.length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const responseTimes = results.filter(r => r.success).map(r => r.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    // Выводим статистику
    console.log('\n=== Load Test Results ===');
    console.log(`Total requests: ${totalRequests}`);
    console.log(`Successful: ${successfulRequests}`);
    console.log(`Failed: ${failedRequests}`);
    console.log(`Success rate: ${successRate.toFixed(2)}%`);
    console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Min response time: ${minResponseTime}ms`);
    console.log(`Max response time: ${maxResponseTime}ms`);
    console.log(`Expected requests: ${requestsPerSecond * loadTestDuration}`);
    console.log(`Actual requests: ${totalRequests}`);

    // Проверяем, что процент успешных запросов > 95%
    expect(successRate).toBeGreaterThan(95);
    expect(totalRequests).toBeGreaterThan(0);
  }, 60000); // 60 секунд таймаут для нагрузочного теста
});
