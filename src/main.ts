import { App } from "./App/index.js";
import { loadFromIni } from "./App/Options/OptionsLoader.js";
import { LoggerFactory } from "./Logger/index.js";

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
        await app.run();
      }
    );
  }
).catch((err) => {
  console.error('Ошибка инициализации logger:', err);
  process.exit(1);
});