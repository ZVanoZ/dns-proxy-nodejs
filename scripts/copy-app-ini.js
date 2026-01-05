import * as fs from "node:fs";
import * as path from "node:path";

const configAppIni = "./config/app.ini";
const configAppIniDist = "./config/app.ini.dist";

// Проверяем, существует ли уже config/app.ini
if (fs.existsSync(configAppIni)) {
  console.log("✓ ./config/app.ini уже существует, пропускаем копирование");
  process.exit(0);
}

// Определяем источник для копирования
let sourceFile = configAppIniDist;
if (!fs.existsSync(configAppIniDist)) {
  console.error("✗ Не найден ./config/app.ini.dist");
  process.exit(1);
}

// Создаем папку config, если её нет
const configDir = path.dirname(configAppIni);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Копируем файл
fs.copyFileSync(sourceFile, configAppIni);
console.log(`✓ Скопирован ${sourceFile} в ${configAppIni}`);

