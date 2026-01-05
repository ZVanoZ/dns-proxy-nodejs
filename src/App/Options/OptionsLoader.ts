import * as fs from "node:fs/promises";
import * as ini from "ini";
import { Options } from "./index.js";

export async function loadFromIni(iniPath: string): Promise<Options> {
  const options = new Options();
  
  try {
    const iniContent = await fs.readFile(iniPath, 'utf-8');
    const parsedIni = ini.parse(iniContent);

    // Валидация и установка значений
    if (parsedIni.app?.host) {
      options.bindHost = parsedIni.app.host;
    }
    
    if (parsedIni.app?.port) {
      const port = parseInt(parsedIni.app.port, 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        options.bindPort = port;
      } else {
        throw new Error(`Invalid port: ${parsedIni.app.port}`);
      }
    }

    // Преобразование объектов в Map
    if (parsedIni.hosts) {
      options.hosts = new Map(Object.entries(parsedIni.hosts));
    }

    if (parsedIni['upstream-dns']) {
      options.upstreamDnsList = Object.entries(parsedIni['upstream-dns'])
        .map(([key, value]) => {
          const map = new Map();
          map.set(parseInt(key, 10), value as string);
          return map;
        });
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load options from ${iniPath}: ${error.message}`);
    }
    throw error;
  }

  return options;
}
