import * as fs from "node:fs";
import * as path from "node:path";

const distDir = "./dist";
const configDir = "./dist/config";

// Проверяем, существует ли dist/
if (!fs.existsSync(distDir)) {
  console.log("✓ Папка ./dist/ не существует, пропускаем очистку");
  process.exit(0);
}

// Получаем список всех элементов в dist/
const items = fs.readdirSync(distDir);

// Удаляем все, кроме config/
for (const item of items) {
  const itemPath = path.join(distDir, item);
  
  // Пропускаем папку config/
  if (item === "config") {
    continue;
  }
  
  const stats = fs.statSync(itemPath);
  
  if (stats.isDirectory()) {
    // Рекурсивно удаляем папку
    fs.rmSync(itemPath, { recursive: true, force: true });
    console.log(`✓ Удалена папка: ${itemPath}`);
  } else {
    // Удаляем файл
    fs.unlinkSync(itemPath);
    console.log(`✓ Удален файл: ${itemPath}`);
  }
}

console.log("✓ Очистка ./dist/ завершена (папка ./dist/config/ сохранена)");
