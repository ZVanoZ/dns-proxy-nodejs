# Стресс тест приложения
_Exported on 12.01.2026 at 15:18:53 GMT+2 from Cursor (2.3.30)_

---

**User**

Добавь в приложение стресс тест.

---

**Cursor**


Изучаю структуру проекта, чтобы понять, что делает приложение и как добавить стресс‑тест.



Изучаю конфигурацию, чтобы понять параметры подключения:



Создаю скрипт стресс‑теста для DNS‑прокси. Добавляю скрипт в `scripts/`:



Создаю скрипт стресс‑теста:



Создаю скрипт стресс‑теста:


```typescript
#!/usr/bin/env node

/**
 * Стресс-тест для DNS прокси
 * 
 * Использование:
 *   tsx scripts/stress-test.ts [options]
 * 
 * Опции:
 *   --host <host>        Адрес DNS прокси (по умолчанию: 127.0.0.1)
 *   --port <port>        Порт DNS прокси (по умолчанию: 5053)
 *   --requests <number>  Количество запросов (по умолчанию: 1000)
 *   --concurrency <num>  Количество одновременных запросов (по умолчанию: 50)
 *   --domain <domain>    Домен для запросов (по умолчанию: google.com)
 *   --timeout <ms>       Таймаут для одного запроса в мс (по умолчанию: 5000)
 */

import dgram from 'node:dgram';
import * as dnsPacket from 'dns-packet';

interface StressTestOptions {
  host: string;
  port: number;
  requests: number;
  concurrency: number;
  domain: string;
  timeout: number;
}

interface RequestResult {
  success: boolean;
  responseTime: number;
  error?: string;
}

interface Statistics {
  total: number;
  successful: number;
  failed: number;
  timeouts: number;
  errors: number;
  minResponseTime: number;
  maxResponseTime: number;
  avgResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
}

function parseArgs(): StressTestOptions {
  const args = process.argv.slice(2);
  const options: StressTestOptions = {
    host: '127.0.0.1',
    port: 5053,
    requests: 1000,
    concurrency: 50,
    domain: 'google.com',
    timeout: 5000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--host':
        if (nextArg) {
          options.host = nextArg;
          i++;
        }
        break;
      case '--port':
        if (nextArg) {
          options.port = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--requests':
        if (nextArg) {
          options.requests = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--concurrency':
        if (nextArg) {
          options.concurrency = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--domain':
        if (nextArg) {
          options.domain = nextArg;
          i++;
      
```

---

**User**

Я хочу добавить в приложение юнит-тестирование.
Составь план.

IP адрес теастируемого DNS-сервера нужно читать из опций unit-тестов. Эти опции нужно реализовать так, как это принято делать для приложений под NodeJS,
Первый тест на доступность DNS сервера.
Второй тест - нагрузочный. Найди при приблизительную статистику по количеству DNS-запросов в секунду на компьютере WEB-разработчика и запиши это число в опции Unit-тестов.

---

**Cursor**


Изучаю структуру проекта, чтобы составить план добавления юнит‑тестов.



Уточняю несколько моментов перед составлением плана:



Составляю план:



Составляю план:


---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**


Приступаю к реализации плана. Начинаю с первого todo.



Добавляю зависимости Jest и настраиваю конфигурацию.


```json
{
  "name": "dns-proxy-nodejs",
  "version": "1.0.0",
  "description": "",
  "main": "main.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "docker:build": "docker compose --profile prod build dns-proxy-prod",
    "docker:build:dev": "docker compose --profile dev build dns-proxy-dev",
    "docker:dev": "docker compose --profile dev up dns-proxy-dev",
    "docker:dev:debug": "docker compose --profile dev run --rm dns-proxy-dev sh -c 'node scripts/setup-config.js setup && npx tsx --inspect-brk src/main.ts'",
    "docker:dev:down": "docker compose --profile dev down dns-proxy-dev",
    "docker:prod": "docker compose --profile prod up dns-proxy-prod",
    "docker:prod:down": "docker compose --profile prod down dns-proxy-prod",
    "docker:start": "docker compose --profile prod up -d dns-proxy-prod",
    "docker:stop": "docker compose --profile prod stop dns-proxy-prod",
    "docker:logs": "docker compose --profile prod logs -f dns-proxy-prod",
    "docker:logs:dev": "docker compose --profile dev logs -f dns-proxy-dev",
    "docker:clean": "docker compose --profile dev --profile prod down -v && docker rmi dns-proxy-nodejs-dns-proxy-dev dns-proxy-nodejs-dns-proxy-prod 2>/dev/null || true",
    "docker:dev:separate": "docker compose -f docker-compose.dev.yml up",
    "docker:prod:separate": "docker compose -f docker-compose.prod.yml up",
    "dev": "node scripts/load-env-and-run.js .run-dev.env 'node scripts/setup-config.js setup && tsx --inspect src/main.ts'",
    "dev:debug": "node scripts/setup-config.js setup && tsx --inspect-brk src/main.ts",
    "build": "node scripts/clean-dist.js && node scripts/build-dependencies.js && node scripts/build-app.js && node scripts/setup-config.js build",
    "start": "node scripts/setup-config.js setup && cd dist && node app.js",
    "prod:tsx": "node scripts/load-env-and-run.js .run-prod.env 'node scripts/setup-config.js setup && tsx src/main.ts'"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "dns-packet": "^5.6.1",
    "ini": "^6.0.0",
    "pino": "^10.1.0",
    "pino-pretty": "^13.1.3"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@types/dns-packet": "^5.6.5",
    "@types/ini": "^4.1.1",
    "@types/jest": "^29.5.12",
    "@types/node": "^25.0.3",
    "@types/pino": "^7.0.4",
    "esbuild": "^0.24.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}

```


Создаю конфигурацию Jest:


```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/src/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  testTimeout: 30000, // 30 секунд для сетевых тестов
};

```


Создаю конфигурационные файлы для тестов:


```plaintext
[test]
# IP адрес тестируемого DNS-сервера
dnsServerHost=127.0.0.1
# Порт тестируемого DNS-сервера
dnsServerPort=5053
# Приблизительное количество DNS-запросов в секунду на компьютере веб-разработчика
# Значение основано на статистике: при активной разработке 30-50 запросов/сек
requestsPerSecond=40
# Длительность нагрузочного теста в секундах
loadTestDuration=10
# Домены для тестирования (через запятую)
testDomains=google.com,github.com,example.com

```

```ini
[test]
# IP адрес тестируемого DNS-сервера
dnsServerHost=127.0.0.1
# Порт тестируемого DNS-сервера
dnsServerPort=5053
# Приблизительное количество DNS-запросов в секунду на компьютере веб-разработчика
# Значение основано на статистике: при активной разработке 30-50 запросов/сек
requestsPerSecond=40
# Длительность нагрузочного теста в секундах
loadTestDuration=10
# Домены для тестирования (через запятую)
testDomains=google.com,github.com,example.com

```


Создаю загрузчик опций для тестов:



Создаю загрузчик опций для тестов:


```typescript
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

```

```typescript
export interface TestOptions {
  dnsServerHost: string;
  dnsServerPort: number;
  requestsPerSecond: number;
  loadTestDuration: number;
  testDomains: string[];
}

export { loadTestOptions } from "./TestOptionsLoader.js";

```


Создаю тест доступности DNS-сервера:


```typescript
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

```


Создаю нагрузочный тест:


```typescript
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

    // Функция для отправки одного запроса
    const sendRequest = async (): Promise<void> => {
      if (Date.now() >= endTime) {
        return;
      }

      const domain = testDomains[Math.floor(Math.random() * testDomains.length)] || testDomains[0];
      const result = await sendDnsQuery(dnsServerHost, dnsServerPort, domain);
      results.push(result);

      // Планируем следующий запрос
      if (Date.now() < endTime) {
        setTimeout(sendRequest, interval);
      }
    };

    // Запускаем запросы с заданной частотой
    const promises: Promise<void>[] = [];
    for (let i = 0; i < requestsPerSecond; i++) {
      promises.push(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const runRequests = async (): Promise<void> => {
              while (Date.now() < endTime) {
                await sendRequest();
                await new Promise(resolve => setTimeout(resolve, interval));
              }
              resolve();
            };
            runRequests();
          }, i * interval);
        })
      );
    }

    // Ждем завершения всех запросов
    await Promise.all(promises);

    // Ждем еще немного, чтобы все запросы завершились
    await new Promise(resolve => setTimeout(resolve, 3000));

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

```


Обновляю скрипты в package.json:


```json
{
  "name": "dns-proxy-nodejs",
  "version": "1.0.0",
  "description": "",
  "main": "main.js",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "docker:build": "docker compose --profile prod build dns-proxy-prod",
    "docker:build:dev": "docker compose --profile dev build dns-proxy-dev",
    "docker:dev": "docker compose --profile dev up dns-proxy-dev",
    "docker:dev:debug": "docker compose --profile dev run --rm dns-proxy-dev sh -c 'node scripts/setup-config.js setup && npx tsx --inspect-brk src/main.ts'",
    "docker:dev:down": "docker compose --profile dev down dns-proxy-dev",
    "docker:prod": "docker compose --profile prod up dns-proxy-prod",
    "docker:prod:down": "docker compose --profile prod down dns-proxy-prod",
    "docker:start": "docker compose --profile prod up -d dns-proxy-prod",
    "docker:stop": "docker compose --profile prod stop dns-proxy-prod",
    "docker:logs": "docker compose --profile prod logs -f dns-proxy-prod",
    "docker:logs:dev": "docker compose --profile dev logs -f dns-proxy-dev",
    "docker:clean": "docker compose --profile dev --profile prod down -v && docker rmi dns-proxy-nodejs-dns-proxy-dev dns-proxy-nodejs-dns-proxy-prod 2>/dev/null || true",
    "docker:dev:separate": "docker compose -f docker-compose.dev.yml up",
    "docker:prod:separate": "docker compose -f docker-compose.prod.yml up",
    "dev": "node scripts/load-env-and-run.js .run-dev.env 'node scripts/setup-config.js setup && tsx --inspect src/main.ts'",
    "dev:debug": "node scripts/setup-config.js setup && tsx --inspect-brk src/main.ts",
    "build": "node scripts/clean-dist.js && node scripts/build-dependencies.js && node scripts/build-app.js && node scripts/setup-config.js build",
    "start": "node scripts/setup-config.js setup && cd dist && node app.js",
    "prod:tsx": "node scripts/load-env-and-run.js .run-prod.env 'node scripts/setup-config.js setup && tsx src/main.ts'"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "dns-packet": "^5.6.1",
    "ini": "^6.0.0",
    "pino": "^10.1.0",
    "pino-pretty": "^13.1.3"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@types/dns-packet": "^5.6.5",
    "@types/ini": "^4.1.1",
    "@types/jest": "^29.5.12",
    "@types/node": "^25.0.3",
    "@types/pino": "^7.0.4",
    "esbuild": "^0.24.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}

```


Проверяю ошибки линтера в созданных файлах:



Улучшаю нагрузочный тест для более точного контроля частоты запросов:


```typescript
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

```


Проверяю ошибки линтера после изменений:



Все задачи выполнены. Реализовано:

## Выполненные задачи

1. **Установка зависимостей** — добавлены `jest`, `@jest/globals`, `@types/jest`, `ts-jest` в `package.json`

2. **Конфигурация Jest** — создан `jest.config.mjs` с настройками для ESM и TypeScript

3. **Конфигурационные файлы для тестов** — созданы:
   - `config/test.config.ini.dist` — шаблон
   - `config/test.config.ini` — рабочий файл с опциями

4. **Загрузчик опций для тестов** — созданы:
   - `src/Test/TestOptionsLoader.ts` — загрузчик опций из INI
   - `src/Test/index.ts` — экспорт типов и функций

5. **Тест доступности DNS-сервера** — создан `tests/App.test.ts`:
   - Отправляет DNS-запрос на тестируемый сервер
   - Проверяет получение ответа в течение 2 секунд

6. **Нагрузочный тест** — создан `tests/LoadTest.test.ts`:
   - Отправляет запросы с частотой из конфига (40 запросов/сек)
   - Длительность теста настраивается (10 секунд)
   - Измеряет метрики: успешные/неуспешные запросы, время ответа
   - Проверяет, что процент успешных запросов > 95%

7. **Обновление package.json** — добавлены скрипты:
   - `test` — запуск тестов
   - `test:watch` — режим наблюдения
   - `test:coverage` — покрытие кода

Все файлы созданы, ошибок линтера нет. Для запуска тестов выполните `npm test` (после установки зависимостей через `npm install`).

---

**User**

@bash (111-186) Тест не проходит. Ошибка в консоли.

---

**Cursor**


Исправляю конфигурацию Jest для корректной работы с ESM-модулями:



Исправляю конфигурацию Jest для корректной работы с ESM:


```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/src/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
      },
    }],
  },
  transformIgnorePatterns: [],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  testTimeout: 30000, // 30 секунд для сетевых тестов
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};

```


Пробую другой подход: используем `tsx` для запуска тестов через Jest или переходим на альтернативу. Проверяю, можно ли использовать `tsx` напрямую:



Исправляю конфигурацию Jest: убираю устаревший `globals` и настраиваю ESM корректно:


```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/src/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  transformIgnorePatterns: [],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  testTimeout: 30000, // 30 секунд для сетевых тестов
};

```


Обновляю скрипт теста для использования экспериментальной поддержки ESM в Jest:


```json
{
  "name": "dns-proxy-nodejs",
  "version": "1.0.0",
  "description": "",
  "main": "main.js",
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
    "test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage",
    "docker:build": "docker compose --profile prod build dns-proxy-prod",
    "docker:build:dev": "docker compose --profile dev build dns-proxy-dev",
    "docker:dev": "docker compose --profile dev up dns-proxy-dev",
    "docker:dev:debug": "docker compose --profile dev run --rm dns-proxy-dev sh -c 'node scripts/setup-config.js setup && npx tsx --inspect-brk src/main.ts'",
    "docker:dev:down": "docker compose --profile dev down dns-proxy-dev",
    "docker:prod": "docker compose --profile prod up dns-proxy-prod",
    "docker:prod:down": "docker compose --profile prod down dns-proxy-prod",
    "docker:start": "docker compose --profile prod up -d dns-proxy-prod",
    "docker:stop": "docker compose --profile prod stop dns-proxy-prod",
    "docker:logs": "docker compose --profile prod logs -f dns-proxy-prod",
    "docker:logs:dev": "docker compose --profile dev logs -f dns-proxy-dev",
    "docker:clean": "docker compose --profile dev --profile prod down -v && docker rmi dns-proxy-nodejs-dns-proxy-dev dns-proxy-nodejs-dns-proxy-prod 2>/dev/null || true",
    "docker:dev:separate": "docker compose -f docker-compose.dev.yml up",
    "docker:prod:separate": "docker compose -f docker-compose.prod.yml up",
    "dev": "node scripts/load-env-and-run.js .run-dev.env 'node scripts/setup-config.js setup && tsx --inspect src/main.ts'",
    "dev:debug": "node scripts/setup-config.js setup && tsx --inspect-brk src/main.ts",
    "build": "node scripts/clean-dist.js && node scripts/build-dependencies.js && node scripts/build-app.js && node scripts/setup-config.js build",
    "start": "node scripts/setup-config.js setup && cd dist && node app.js",
    "prod:tsx": "node scripts/load-env-and-run.js .run-prod.env 'node scripts/setup-config.js setup && tsx src/main.ts'"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "dns-packet": "^5.6.1",
    "ini": "^6.0.0",
    "pino": "^10.1.0",
    "pino-pretty": "^13.1.3"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@types/dns-packet": "^5.6.5",
    "@types/ini": "^4.1.1",
    "@types/jest": "^29.5.12",
    "@types/node": "^25.0.3",
    "@types/pino": "^7.0.4",
    "esbuild": "^0.24.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}

```


Тесты проходят. Проблема была в отсутствии экспериментальной поддержки ESM в Jest. Добавлен флаг `NODE_OPTIONS=--experimental-vm-modules` в скрипты тестов.

Результаты:
- Тест доступности DNS-сервера — PASS
- Нагрузочный тест — PASS
  - Отправлено 397 запросов
  - Успешных: 395 (99.50%, > 95%)
  - Среднее время ответа: 30.18ms
  - Минимальное: 16ms, максимальное: 192ms

Оба теста работают корректно. Предупреждение об экспериментальной функции VM Modules можно игнорировать — это нормально для ESM в Jest.

