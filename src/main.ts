import { App } from "./App/index.js";
import { loadFromIni } from "./App/Options/OptionsLoader.js";
import { LoggerFactory } from "./Logger/index.js";
import { DnsCache } from "./DnsCache/index.js";

// console.trace('process.env', process.env);

// Инициализируем logger перед запуском приложения
LoggerFactory.create().then(
  async (logger) => {
    console.debug('-- Создан logger:', logger);
    const app = new App();
    app.setLogger(logger);

    const iniPath = process.env.APP_INI_PATH || './config/app.ini';
    loadFromIni(iniPath).then(
      async (options) => {
        console.debug('-- Считаны настройки приложения options:', options);
        app.setOptions(options);
        
        // Инициализация кеша DNS (если включен)
        if (options.dnsCache?.enabled) {
          const cache = new DnsCache(
            options.dnsCache.maxSize,
            options.dnsCache.maxTtl,
            options.dnsCache.negativeTtl
          );
          app.setDnsCache(cache);
          logger.info({ 
            maxSize: options.dnsCache.maxSize,
            maxTtl: options.dnsCache.maxTtl,
            negativeTtl: options.dnsCache.negativeTtl
          }, 'DNS cache initialized');
        }
        
        await app.run();
      }
    );
  }
).catch((err) => {
  console.error('Ошибка инициализации logger:', err);
  process.exit(1);
});