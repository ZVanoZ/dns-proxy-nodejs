import {App} from "./App/index.js";
import {loadFromIni} from "./App/Options/OptionsLoader.js";

const app = new App();
loadFromIni('./config/app.ini').then(
  async (options) =>
  {
    app.setOptions(options);
    await app.run();
  }
);