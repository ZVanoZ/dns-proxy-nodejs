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

    // Загрузка именованных цепочек DNS-серверов
    if (parsedIni['upstream-dns']) {
      const upstreamDnsSection = parsedIni['upstream-dns'];
      for (const [chainName, chainValue] of Object.entries(upstreamDnsSection)) {
        // Значение - это строка вида "IP:PORT,IP:PORT,..."
        const servers = (chainValue as string)
          .split(',')
          .map(server => server.trim())
          .filter(server => server.length > 0);
        options.upstreamDnsChains.set(chainName, servers);
      }
    }

    // Загрузка масок DNS-имен
    if (parsedIni['masked-dns']) {
      const maskedDnsSection = parsedIni['masked-dns'];
      // Сохраняем порядок из файла, используя Object.entries
      for (const [mask, chainName] of Object.entries(maskedDnsSection)) {
        // Убираем кавычки из маски, если они есть
        const cleanMask = mask.replace(/^["']|["']$/g, '');
        options.maskedDns.set(cleanMask, chainName as string);
      }
    }

    // Загрузка настроек кеша DNS
    if (parsedIni['dns-cache']) {
      const dnsCacheSection = parsedIni['dns-cache'];
      options.dnsCache = {
        enabled: dnsCacheSection.enabled === 'true' || dnsCacheSection.enabled === true || dnsCacheSection.enabled === '1',
        maxSize: dnsCacheSection['max-size'] 
          ? parseInt(dnsCacheSection['max-size'], 10) 
          : 1000,
        maxTtl: dnsCacheSection['max-ttl']
          ? parseInt(dnsCacheSection['max-ttl'], 10)
          : 86400,
        negativeTtl: dnsCacheSection['negative-ttl']
          ? parseInt(dnsCacheSection['negative-ttl'], 10)
          : 60
      };
      
      // Валидация значений
      if (options.dnsCache.maxSize <= 0) {
        throw new Error(`Invalid dns-cache.max-size: ${options.dnsCache.maxSize}`);
      }
      if (options.dnsCache.maxTtl <= 0) {
        throw new Error(`Invalid dns-cache.max-ttl: ${options.dnsCache.maxTtl}`);
      }
      if (options.dnsCache.negativeTtl <= 0) {
        throw new Error(`Invalid dns-cache.negative-ttl: ${options.dnsCache.negativeTtl}`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load options from ${iniPath}: ${error.message}`);
    }
    throw error;
  }

  return options;
}
