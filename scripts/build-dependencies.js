import * as esbuild from "esbuild";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const entryPoint = path.join(projectRoot, "src", "_dependencies.ts");
const outFile = path.join(projectRoot, "dist", "node_modules.js");

// Получаем список встроенных модулей Node.js
const builtinModules = await import("module").then(m => m.builtinModules || []);

try {
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outFile,
    platform: "node",
    target: "esnext",
    format: "esm",
    sourcemap: true,
    minify: false,
    packages: "bundle",
    // Исключаем встроенные модули Node.js из сборки
    external: [...builtinModules],
    logLevel: "info",
  });
  
  // После сборки заменяем динамические require встроенных модулей на статические импорты
  const fs = await import("node:fs/promises");
  let content = await fs.readFile(outFile, "utf8");
  
  // Находим все использования __require для встроенных модулей и заменяем их
  // Сначала добавляем импорты встроенных модулей в начало файла
  const usedBuiltins = new Set();
  const requireRegex = /__require\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = requireRegex.exec(content)) !== null) {
    const moduleName = match[1];
    if (builtinModules.includes(moduleName)) {
      usedBuiltins.add(moduleName);
    }
  }
  
  // Добавляем импорты встроенных модулей в начало файла
  if (usedBuiltins.size > 0) {
    const imports = Array.from(usedBuiltins)
      .map(mod => `import * as ${mod.replace(/[^a-zA-Z0-9]/g, '_')} from '${mod}';`)
      .join('\n');
    
    // Находим первое место после комментариев/пустых строк для вставки импортов
    const firstImportMatch = content.match(/^(.*?)(import |export |var |function |class |const |let )/m);
    if (firstImportMatch) {
      const insertPos = firstImportMatch.index + firstImportMatch[1].length;
      content = content.slice(0, insertPos) + imports + '\n' + content.slice(insertPos);
    } else {
      content = imports + '\n' + content;
    }
    
    // Заменяем __require('buffer') на buffer_ (или другое имя)
    for (const mod of usedBuiltins) {
      const varName = mod.replace(/[^a-zA-Z0-9]/g, '_');
      const regex = new RegExp(`__require\\(['"]${mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g');
      content = content.replace(regex, varName);
    }
    
    await fs.writeFile(outFile, content, "utf8");
  }
  
  console.log(`✓ Сборка зависимостей завершена: ${outFile}`);
} catch (error) {
  console.error("✗ Ошибка при сборке зависимостей:", error);
  process.exit(1);
}
