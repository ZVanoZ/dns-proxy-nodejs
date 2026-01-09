import * as esbuild from "esbuild";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const entryPoint = path.join(projectRoot, "src", "main.ts");
const outFile = path.join(projectRoot, "dist", "app.js");

try {
  // Плагин для исключения всех node: модулей
  const nodeModulesPlugin = {
    name: 'node-modules',
    setup(build) {
      // Исключаем все node: модули
      build.onResolve({ filter: /^node:/ }, args => {
        return { path: args.path, external: true };
      });
    },
  };

  // Сначала собираем app.js с external зависимостями
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outFile,
    platform: "node",
    target: "esnext",
    format: "esm",
    sourcemap: true,
    minify: false,
    // Исключаем внешние зависимости
    external: [
      "ini", 
      "dns-packet",
      "pino",
      "pino-pretty"
    ],
    plugins: [nodeModulesPlugin],
    logLevel: "info",
  });
  
  // Читаем собранный файл
  let appContent = await fs.readFile(outFile, "utf8");
  
  // Удаляем импорты из node_modules (они будут заменены на импорт из node_modules.js)
  appContent = appContent.replace(
    /import\s+(\*\s+as\s+)?(\w+)\s+from\s+["']ini["'];?\n?/g,
    ""
  );
  appContent = appContent.replace(
    /import\s+(\*\s+as\s+)?(\w+)\s+from\s+["']dns-packet["'];?\n?/g,
    ""
  );
  
  // Добавляем импорт node_modules.js в начало, если его еще нет
  if (!appContent.includes("from './node_modules.js'")) {
    // Находим последний импорт node: модулей
    const nodeImportsMatch = appContent.match(/(import .+ from ["']node:.+["'];?\n)+/);
    if (nodeImportsMatch) {
      const insertPos = nodeImportsMatch.index + nodeImportsMatch[0].length;
      appContent = appContent.slice(0, insertPos) + 
                   "import * as node_modules from './node_modules.js';\n" +
                   appContent.slice(insertPos);
    } else {
      appContent = "import * as node_modules from './node_modules.js';\n" + appContent;
    }
  }
  
  // Заменяем использование ini на node_modules.ini
  // Используем более точный подход - заменяем только отдельные вхождения ini
  // Сначала заменяем паттерны типа: ini.parse, ini.encode, etc.
  appContent = appContent.replace(/(?<!node_modules\.)\bini\.(\w+)/g, "node_modules.ini.$1");
  
  // Затем заменяем использование ini как переменной (но не в строках)
  // Используем отрицательный lookbehind, чтобы не заменить внутри node_modules.ini
  appContent = appContent.replace(/(?<!node_modules\.)(?<!['"])\bini\b(?!['"])/g, "node_modules.ini");
  
  // Заменяем использование dnsPacket на node_modules.dnsPacket
  // Сначала заменяем паттерны типа: dnsPacket.decode, dnsPacket.encode, etc.
  appContent = appContent.replace(/(?<!node_modules\.)\bdnsPacket\.(\w+)/g, "node_modules.dnsPacket.$1");
  
  // Затем заменяем использование dnsPacket как переменной (но не в строках и не в типах)
  // Используем отрицательный lookbehind, чтобы не заменить внутри node_modules.dnsPacket
  appContent = appContent.replace(/(?<!node_modules\.)(?<!['"])(?<!type\s+)(?<!import\s+)\bdnsPacket\b(?!['"])(?!Module)/g, "node_modules.dnsPacket");
  
  await fs.writeFile(outFile, appContent, "utf8");
  
  console.log(`✓ Сборка завершена: ${outFile}`);
} catch (error) {
  console.error("✗ Ошибка при сборке:", error);
  process.exit(1);
}
