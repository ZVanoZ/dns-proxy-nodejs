# Информация по API node:dgram для IPv6

**Задача:** task20260121120400  
**Дата:** 2026-01-30

## Модуль: `node:dgram`

### Создание сокетов

- `dgram.createSocket('udp4')` или `dgram.createSocket({ type: 'udp4', reuseAddr: true })` — IPv4.
- `dgram.createSocket('udp6')` или `dgram.createSocket({ type: 'udp6', reuseAddr: true, ipv6Only: true })` — IPv6.

Для одновременной привязки IPv4 и IPv6 на один порт (Linux/Docker) нужно:
- **reuseAddr: true** — у обоих сокетов, чтобы порт мог использоваться обоими.
- **ipv6Only: true** — у udp6, чтобы сокет слушал только IPv6 и не конфликтовал с привязкой 0.0.0.0.

Тип возвращаемого значения: `dgram.Socket`.

### Привязка

- `socket.bind(port[, address][, callback])`
  - Для IPv4: `address` например `'0.0.0.0'`.
  - Для IPv6: `address` например `'::'`.
  - Один и тот же `port` можно использовать для обоих сокетов (разные адреса).

### События и отправка

- `socket.on('message', (msg, rinfo) => { ... })` — при получении сообщения. `rinfo` содержит `address`, `port`, `family` ('IPv4' | 'IPv6').
- `socket.send(msg, offset, length, port, address[, callback])` — отправка. Ответ нужно отправлять тем же сокетом, который получил запрос (передавать сокет в обработчик через замыкание или аргумент).

### Ошибки

- `socket.on('error', (err) => { ... })` — обрабатывать для каждого сокета отдельно.
- При `EADDRINUSE` закрывать только этот сокет; второй (если есть) продолжает работать.

### Типы (TypeScript)

- `import type { Socket, RemoteInfo } from 'node:dgram'`
- `RemoteInfo`: `{ address: string; port: number; family: 'IPv4' | 'IPv6'; ... }`
