import { App } from "./App/index.js";
import { loadFromIni } from "./App/Options/OptionsLoader.js";
import { LoggerFactory } from "./Logger/index.js";

// Инициализируем logger перед запуском приложения
LoggerFactory.create().then(
  async (logger) => {
    const app = new App();
    app.setLogger(logger);

    loadFromIni('./config/app.ini').then(
      async (options) => {
        app.setOptions(options);
        await app.run();
      }
    );
  }
).catch((err) => {
  console.error('Ошибка инициализации logger:', err);
  process.exit(1);
});