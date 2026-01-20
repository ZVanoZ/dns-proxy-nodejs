/**
 *  Этот файл используется только для сборки зависимостей в node_modules.js
 *  и для импорта зависимостей в другие файлы.
 *  Все зависимости должны быть импортированы здесь
 */

import * as iniModule from "ini";
export { iniModule as ini };
export * as dnsPacket from "dns-packet";
export type { Answer, DecodedPacket } from "dns-packet";
