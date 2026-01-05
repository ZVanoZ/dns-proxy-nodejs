import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const configAppIni = "./config/app.ini";
const configAppIniDist = "./config/app.ini.dist";
const distConfigAppIniDist = "./dist/config/app.ini.dist";
const distConfigAppIni = "./dist/config/app.ini";
const distConfigAppIniMd5 = "./dist/config/app.ini.md5";

/**
 * Вычисляет MD5 хеш файла
 */
function calculateMd5(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath);
  return createHash("md5").update(content).digest("hex");
}

/**
 * Сохраняет MD5 хеш в файл
 */
function saveMd5(filePath, hash) {
  fs.writeFileSync(filePath, hash, "utf8");
}

/**
 * Читает MD5 хеш из файла
 */
function readMd5(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8").trim();
}

/**
 * Копирует файл с созданием директорий при необходимости
 */
function copyFile(source, target) {
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(source, target);
}

/**
 * Задача 1: Копирует app.ini.dist в app.ini, если app.ini отсутствует
 */
function ensureAppIni() {
  if (fs.existsSync(configAppIni)) {
    console.log("✓ ./config/app.ini уже существует");
    return;
  }

  if (!fs.existsSync(configAppIniDist)) {
    console.error("✗ Не найден ./config/app.ini.dist");
    process.exit(1);
  }

  copyFile(configAppIniDist, configAppIni);
  console.log(`✓ Скопирован ${configAppIniDist} в ${configAppIni}`);
}

/**
 * Задача 2: Копирует app.ini.dist в dist/config/app.ini.dist с заменой
 */
function copyDistToDist() {
  if (!fs.existsSync(configAppIniDist)) {
    console.error("✗ Не найден ./config/app.ini.dist");
    process.exit(1);
  }

  copyFile(configAppIniDist, distConfigAppIniDist);
  console.log(`✓ Скопирован ${configAppIniDist} в ${distConfigAppIniDist}`);
}

/**
 * Задача 3: Копирует app.ini в dist/config/app.ini с проверкой MD5
 */
function copyAppIniToDist() {
  if (!fs.existsSync(configAppIni)) {
    console.log("⚠ ./config/app.ini не существует, пропускаем копирование в dist/");
    return;
  }

  const currentMd5 = calculateMd5(configAppIni);
  const savedMd5 = readMd5(distConfigAppIniMd5);
  const distExists = fs.existsSync(distConfigAppIni);
  // const distMd5 = distExists ? calculateMd5(distConfigAppIni) : null;
  // if (distMd5 !== savedMd5) {
  //   console.info(
  //     `-> MD5 хеш dist/config/app.ini изменился : 
  //     |> было : ${savedMd5} 
  //     |> стало: ${distMd5}`
  //   );
  // }

  // Проверяем, нужно ли копировать
  const shouldCopy = !distExists || (savedMd5 !== null && currentMd5 !== savedMd5);

  if (shouldCopy) {
    copyFile(configAppIni, distConfigAppIni);
    saveMd5(distConfigAppIniMd5, currentMd5);
    console.log(`✓ Скопирован ${configAppIni} в ${distConfigAppIni}`);
    if (currentMd5 !== savedMd5 && savedMd5 !== null) {
      console.log(
        `-> MD5 хеш изменился: 
        |> было : ${savedMd5} 
        |> стало: ${currentMd5}`
      );
    }
  } else {
    console.log("✓ ./dist/config/app.ini актуален, пропускаем копирование");
  }
}

// Определяем режим работы
const mode = process.argv[2] || "setup";

try {
  switch (mode) {
    case "setup":
      // При запуске или сборке: только задача 1
      ensureAppIni();
      break;
    case "build":
      // При сборке: все задачи
      ensureAppIni();
      copyDistToDist();
      copyAppIniToDist();
      break;
    default:
      console.error(`✗ Неизвестный режим: ${mode}`);
      console.error("Использование: node setup-config.js [setup|build]");
      process.exit(1);
  }
} catch (error) {
  console.error("✗ Ошибка:", error.message);
  process.exit(1);
}
