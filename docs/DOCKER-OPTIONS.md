# Варианты конфигурации Docker для DEV и PROD

## Проблема
Необходимо разделить конфигурации DEV и PROD, чтобы они не запускались одновременно.

## Быстрый старт (Решение 1 - Профили)

**Через npm:**
```bash
npm run docker:dev      # Запуск DEV
npm run docker:prod     # Запуск PROD (с автоперезапуском)
npm run docker:build    # Сборка PROD образа
```

**Через docker compose:**
```bash
docker compose --profile dev up dns-proxy-dev    # Запуск DEV
docker compose --profile prod up dns-proxy-prod # Запуск PROD (с автоперезапуском)
docker compose --profile prod build             # Сборка PROD образа
```

**Через docker:**
```bash
# Сборка
docker build -f env/prod/Dockerfile -t dns-proxy-nodejs:prod .

# Запуск PROD (с автоперезапуском)
docker run -d --name dns-proxy-prod \
  -p "53:5053/udp" \
  -v "$(pwd)/env/prod/config:/app/config" \
  -v "$(pwd)/env/prod/logs:/app/logs" \
  -v "$(pwd)/scripts:/app/scripts" \
  --env-file env/prod/.env \
  -e APP_INI_PATH=/app/config/app.ini \
  --restart always \
  dns-proxy-nodejs:prod
```

**Важно:** PROD режим настроен с `restart: always` для автоматического перезапуска при падении контейнера.

---

## Решение 1: Профили Docker Compose (РЕКОМЕНДУЕТСЯ) ✅

**Файл:** `docker-compose.yml`

Использует встроенную функцию профилей Docker Compose. Сервисы запускаются только при указании соответствующего профиля.

### Преимущества:
- Один файл конфигурации
- Встроенная поддержка в Docker Compose
- Гибкость: можно запустить оба профиля одновременно при необходимости
- Простота использования

### Использование:

#### Вариант A: Через npm (рекомендуется)

**DEV режим:**
```bash
# Запуск в foreground (с выводом логов)
npm run docker:dev

# Запуск в background (daemon)
npm run docker:start

# Остановка
npm run docker:stop

# Просмотр логов
npm run docker:logs:dev

# Остановка и удаление контейнера
npm run docker:dev:down

# Запуск с отладчиком
npm run docker:dev:debug
```

**PROD режим:**
```bash
# Запуск в foreground (с выводом логов)
npm run docker:prod

# Запуск в background (daemon) с автоперезапуском
npm run docker:start

# Остановка
npm run docker:stop

# Просмотр логов
npm run docker:logs

# Остановка и удаление контейнера
npm run docker:prod:down
```

> **Примечание:** PROD режим использует `restart: always` для автоматического перезапуска контейнера при любом падении.

**Сборка образов:**
```bash
# Сборка DEV образа
npm run docker:build:dev

# Сборка PROD образа
npm run docker:build

# Очистка (удаление контейнеров, volumes и образов)
npm run docker:clean
```

#### Вариант B: Через docker compose

**DEV режим:**
```bash
# Запуск в foreground (с выводом логов)
docker compose --profile dev up dns-proxy-dev

# Запуск в background (daemon)
docker compose --profile dev up -d dns-proxy-dev

# Остановка
docker compose --profile dev stop dns-proxy-dev

# Просмотр логов
docker compose --profile dev logs -f dns-proxy-dev

# Остановка и удаление контейнера
docker compose --profile dev down dns-proxy-dev

# Запуск с отладчиком
docker compose --profile dev run --rm dns-proxy-dev sh -c 'node scripts/setup-config.js setup && npx tsx --inspect-brk src/main.ts'
```

**PROD режим:**
```bash
# Запуск в foreground (с выводом логов)
docker compose --profile prod up dns-proxy-prod

# Запуск в background (daemon) с автоперезапуском
docker compose --profile prod up -d dns-proxy-prod

# Остановка
docker compose --profile prod stop dns-proxy-prod

# Просмотр логов
docker compose --profile prod logs -f dns-proxy-prod

# Остановка и удаление контейнера
docker compose --profile prod down dns-proxy-prod
```

> **Примечание:** PROD режим использует `restart: always` для автоматического перезапуска контейнера при любом падении.

**Сборка образов:**
```bash
# Сборка DEV образа
docker compose --profile dev build dns-proxy-dev

# Сборка PROD образа
docker compose --profile prod build dns-proxy-prod

# Сборка без кеша
docker compose --profile dev build --no-cache dns-proxy-dev
docker compose --profile prod build --no-cache dns-proxy-prod

# Очистка (удаление контейнеров, volumes и образов)
docker compose --profile dev --profile prod down -v
docker rmi dns-proxy-nodejs-dns-proxy-dev dns-proxy-nodejs-dns-proxy-prod
```

**Примечание:** В проекте используется `docker compose` (с пробелом) - это встроенная команда Docker CLI начиная с версии 20.10+. Если у вас установлена старая версия Docker с отдельной утилитой `docker-compose` (с дефисом), вам нужно либо обновить Docker, либо установить совместимость через алиас.

#### Вариант C: Через docker (без compose)

**Сборка образов:**
```bash
# Сборка DEV образа
docker build -f Dockerfile.dev -t dns-proxy-nodejs:dev .

# Сборка PROD образа
docker build -f Dockerfile -t dns-proxy-nodejs:prod .
```

**DEV режим:**
```bash
# Запуск в foreground (с выводом логов)
docker run --rm \
  --name dns-proxy-dev \
  --network host \
  -v "$(pwd)/src:/app/src" \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/dist:/app/dist" \
  -v "$(pwd)/scripts:/app/scripts" \
  -v "$(pwd)/env/dev/.env:/app/.run-dev.env" \
  --env-file env/dev/.env \
  -e NODE_ENV=development \
  dns-proxy-nodejs:dev

# Запуск в background (daemon)
docker run -d \
  --name dns-proxy-dev \
  --network host \
  -v "$(pwd)/src:/app/src" \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/dist:/app/dist" \
  -v "$(pwd)/scripts:/app/scripts" \
  -v "$(pwd)/env/dev/.env:/app/.run-dev.env" \
  --env-file env/dev/.env \
  -e NODE_ENV=development \
  --restart unless-stopped \
  dns-proxy-nodejs:dev

# Остановка
docker stop dns-proxy-dev

# Удаление контейнера
docker rm dns-proxy-dev

# Просмотр логов
docker logs -f dns-proxy-dev

# Запуск с отладчиком
docker run --rm \
  --name dns-proxy-dev \
  --network host \
  -v "$(pwd)/src:/app/src" \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/dist:/app/dist" \
  -v "$(pwd)/scripts:/app/scripts" \
  -v "$(pwd)/env/dev/.env:/app/.run-dev.env" \
  --env-file env/dev/.env \
  -e NODE_ENV=development \
  dns-proxy-nodejs:dev \
  sh -c "node scripts/setup-config.js setup && npx tsx --inspect-brk src/main.ts"
```

**PROD режим:**
```bash
# Запуск в foreground (с выводом логов)
docker run --rm \
  --name dns-proxy-prod \
  -p "53:5053/udp" \
  -v "$(pwd)/env/prod/config:/app/config" \
  -v "$(pwd)/env/prod/logs:/app/logs" \
  -v "$(pwd)/scripts:/app/scripts" \
  --env-file env/prod/.env \
  -e APP_INI_PATH=/app/config/app.ini \
  --restart always \
  dns-proxy-nodejs:prod

# Запуск в background (daemon) с автоперезапуском
docker run -d \
  --name dns-proxy-prod \
  -p "53:5053/udp" \
  -v "$(pwd)/env/prod/config:/app/config" \
  -v "$(pwd)/env/prod/logs:/app/logs" \
  -v "$(pwd)/scripts:/app/scripts" \
  --env-file env/prod/.env \
  -e APP_INI_PATH=/app/config/app.ini \
  --restart always \
  dns-proxy-nodejs:prod

# Остановка
docker stop dns-proxy-prod

# Удаление контейнера
docker rm dns-proxy-prod

# Просмотр логов
docker logs -f dns-proxy-prod

# Перезапуск контейнера
docker restart dns-proxy-prod
```

**Управление контейнерами:**
```bash
# Просмотр запущенных контейнеров
docker ps

# Просмотр всех контейнеров (включая остановленные)
docker ps -a

# Просмотр логов последних 100 строк
docker logs --tail 100 dns-proxy-prod

# Выполнение команды внутри контейнера
docker exec -it dns-proxy-prod sh

# Удаление образа
docker rmi dns-proxy-nodejs:dev
docker rmi dns-proxy-nodejs:prod

# Очистка неиспользуемых ресурсов
docker system prune -a
```

**Примечания:**
- PROD режим использует bridge network с маппингом порта `53:5053/udp` (порт 53 на хосте → порт 5053 в контейнере)
- DEV режим использует bridge network с маппингом порта `5053:53/udp` (порт 5053 на хосте → порт 53 в контейнере)
- `--restart always` для PROD режима обеспечивает автоматический перезапуск при падении контейнера
- `--restart unless-stopped` для DEV режима перезапускает контейнер, если он не был остановлен вручную
- PROD режим не требует `--cap-add NET_BIND_SERVICE`, так как приложение работает на порту 5053 внутри контейнера
- `--rm` автоматически удаляет контейнер после остановки (только для foreground режима)

---

## Решение 2: Отдельные файлы

**Файлы:** 
- `docker-compose.dev.yml` - для разработки
- `docker-compose.prod.yml` - для продакшена

### Преимущества:
- Полная изоляция конфигураций
- Простота понимания
- Невозможно случайно запустить оба режима

### Использование:

```bash
# DEV режим
npm run docker:dev:separate
# или
docker compose -f docker-compose.dev.yml up

# PROD режим
npm run docker:prod:separate
# или
docker compose -f docker-compose.prod.yml up
```

---

## Решение 3: Один файл с явным указанием сервиса

**Файл:** `docker-compose.yml` (без профилей)

Сервисы запускаются только при явном указании имени сервиса в команде.

### Преимущества:
- Один файл
- Простота

### Недостатки:
- Можно случайно запустить оба сервиса командой `docker compose up`
- Менее явное разделение

### Использование:

```bash
# DEV режим
docker compose up dns-proxy-dev

# PROD режим
docker compose up dns-proxy-prod
```

---

## Рекомендация

**Используйте Решение 1 (Профили)** - это наиболее гибкий и современный подход, который предотвращает случайный запуск обоих режимов, но позволяет запустить их одновременно при необходимости.

---

## Диагностика DNS-запросов

### Проверка DNS-запросов в DEV режиме

DEV режим (через docker compose) по умолчанию слушает порт 53 **внутри контейнера** и маппится на порт 5053 на хосте:

```bash
nslookup google.com 127.0.0.1 -port=5053
nslookup google.com localhost -port=5053
```

### Проверка DNS-запросов в PROD режиме (docker compose)

PROD режим (через docker compose) по умолчанию:
- слушает порт 5053 внутри контейнера
- маппится на порт 53 на хосте: `53:5053/udp`

Проверка:

```bash
nslookup google.com 127.0.0.1
nslookup google.com localhost
```

**Важно:** При использовании bridge network с фиксированными IP адресами (как настроено в `docker-compose.yml`), запросы к `127.0.0.1` могут не работать, так как контейнер находится в отдельной сети.

В этом случае используйте фиксированный IP контейнера:

**PROD режим:**
```bash
nslookup google.com 192.168.13.13
```

**DEV режим:**
```bash
nslookup google.com 192.168.13.133 -port=5053
```

Если вы запускаете контейнеры **без** docker compose (через `docker run`), то IP контейнера может отличаться. В этом случае:

1. Найдите IP контейнера:

```bash
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dns-proxy-prod
```

2. Проверьте запрос напрямую к этому IP:

```bash
nslookup google.com <IP_КОНТЕЙНЕРА>
```

### Диагностика проблем с DNS

Если `nslookup google.com 127.0.0.1` возвращает:

```text
;; communications error to 127.0.0.1#53: timed out
```

проверьте:

1. Запущен ли PROD контейнер:

```bash
docker ps | grep dns-proxy-prod
```

2. Какие порты слушает контейнер:

```bash
docker compose --profile prod ps
docker compose --profile prod config | grep -A3 ports:
```

3. Что DNS-запросы проходят к контейнеру по его фиксированному IP:

**PROD режим:**
```bash
nslookup google.com 192.168.13.13
```

**DEV режим:**
```bash
nslookup google.com 192.168.13.133 -port=5053
```

Если по фиксированному IP контейнера запросы работают, а через `127.0.0.1` — нет, это нормально:
- контейнер находится в отдельной bridge сети (`192.168.13.0/24`)
- для доступа используйте фиксированный IP: `192.168.13.13` (PROD) или `192.168.13.133` (DEV)

---

## Фиксированные IP адреса для контейнеров

В `docker-compose.yml` настроены фиксированные IP адреса для контейнеров через переменные окружения:

- **PROD режим:** `${PROD_SERVER_IP}` (по умолчанию: `192.168.13.13`), IPv6: `${PROD_SERVER_IPV6}` (по умолчанию: `fd00:0:0:1::13`)
- **DEV режим:** `${DEV_SERVER_IP}` (по умолчанию: `192.168.13.133`), IPv6: `${DEV_SERVER_IPV6}` (по умолчанию: `fd00:0:0:1::133`)
- **Подсеть:** `${NETWORK_SUBNET}` (по умолчанию: `192.168.13.0/24`), IPv6: `${NETWORK_SUBNET_IPV6}` (по умолчанию: `fd00:0:0:1::/80`)

### Настройка переменных окружения

Перед запуском Docker Compose создайте файл `.env` в корне проекта на основе `.env.dist`:

```bash
cp .env.dist .env
```

Отредактируйте `.env` файл при необходимости:

```bash
# IP адрес контейнера DEV режима
DEV_SERVER_IP=192.168.13.133

# IP адрес контейнера PROD режима
PROD_SERVER_IP=192.168.13.13

# Подсеть для Docker bridge network
NETWORK_SUBNET=192.168.13.0/24
# IPv6 (опционально)
# NETWORK_SUBNET_IPV6=fd00:0:0:1::/80
# DEV_SERVER_IPV6=fd00:0:0:1::133
# PROD_SERVER_IPV6=fd00:0:0:1::13
```

### Конфигурация сети в docker-compose.yml

Сеть включена в режиме dual-stack (IPv4 + IPv6). При необходимости IPv6-адреса и подсеть можно переопределить в `.env`:

```yaml
networks:
  default:
    name: dns-proxy-nodejs-net
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: ${NETWORK_SUBNET}
        - subnet: ${NETWORK_SUBNET_IPV6:-fd00:0:0:1::/80}

services:
  dns-proxy-prod:
    networks:
      default:
        ipv4_address: ${PROD_SERVER_IP}
        ipv6_address: ${PROD_SERVER_IPV6:-fd00:0:0:1::13}

  dns-proxy-dev:
    networks:
      default:
        ipv4_address: ${DEV_SERVER_IP}
        ipv6_address: ${DEV_SERVER_IPV6:-fd00:0:0:1::133}
```

Это гарантирует:
- стабильные IP адреса после перезапуска компьютера и Docker
- предсказуемое поведение при перезапусках
- возможность один раз настроить DNS в ОС и не менять его

> **Важно:** перед использованием подсети `192.168.13.0/24` убедитесь, что она не конфликтует с существующими сетями в вашей системе:
> ```bash
> docker network ls
> docker network inspect <network_name>
> ip addr
> ```

### Настройка DNS в операционной системе

После запуска контейнеров с фиксированными IP адресами:

1. Откройте настройки сетевого соединения вашей ОС.
2. Перейдите на вкладку `IPv4`.
3. В поле «Другие DNS-серверы» (или аналогичном) укажите:

**Для PROD режима:**
```text
${PROD_SERVER_IP}  # По умолчанию: 192.168.13.13
```

**Для DEV режима (если нужно):**
```text
${DEV_SERVER_IP}  # По умолчанию: 192.168.13.133
```

4. Сохраните настройки.

После этого:
- вам не нужно каждый раз смотреть текущий IP контейнера,
- после перезапуска компьютера и Docker IP адреса останутся теми же (значения из `.env` файла),
- все приложения, использующие системный DNS, будут автоматически ходить в соответствующий DNS-прокси.

> **Примечание:** Если вы изменили значения IP адресов в `.env` файле, обновите настройки DNS в операционной системе соответственно.

---

## Версия Node.js

Все Dockerfile используют `node:20.17-alpine`, что соответствует требованиям:
- Большинство пакетов требуют `>=18`
- Некоторые пакеты требуют `^20.17.0 || >=22.9.0`

Node.js 20.17 LTS полностью совместим с вашими зависимостями.
