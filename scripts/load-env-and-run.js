import * as fs from "node:fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Загружает переменные окружения из .env файла
 */
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠ Файл ${envPath} не найден, переменные окружения не загружены`);
    return {};
  }

  const content = fs.readFileSync(envPath, "utf8");
  const env = {};

  content.split("\n").forEach((line) => {
    line = line.trim();
    // Пропускаем пустые строки и комментарии
    if (!line || line.startsWith("#")) {
      return;
    }

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Убираем кавычки если есть
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });

  return env;
}

// Получаем имя файла окружения из аргументов
const envFileName = process.argv[2];

if (!envFileName) {
  console.error("✗ Не указан файл окружения");
  console.error("Использование: node load-env-and-run.js <env-file> <command> [args...]");
  process.exit(1);
}

// Загружаем переменные из указанного файла окружения
const projectRoot = path.resolve(__dirname, "..");
const envFile = path.join(projectRoot, envFileName);
const envVars = loadEnvFile(envFile);

// Устанавливаем переменные окружения в текущий процесс
Object.keys(envVars).forEach((key) => {
  process.env[key] = envVars[key];
});

// Получаем команду и аргументы из оставшихся аргументов скрипта
const commandLine = process.argv.slice(3).join(" ");

if (!commandLine) {
  console.error("✗ Не указана команда для выполнения");
  console.error("Использование: node load-env-and-run.js <env-file> <command> [args...]");
  process.exit(1);
}

// Запускаем команду с загруженными переменными окружения
// Используем shell для поддержки && и других операторов
const child = spawn(commandLine, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("error", (error) => {
  console.error(`✗ Ошибка запуска команды: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
