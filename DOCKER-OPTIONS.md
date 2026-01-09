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
docker build -f Dockerfile -t dns-proxy-nodejs:prod .

# Запуск PROD (с автоперезапуском)
docker run -d --name dns-proxy-prod --network host \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/logs:/app/logs" \
  -v "$(pwd)/scripts:/app/scripts" \
  --env-file .run-prod.env \
  --cap-add NET_BIND_SERVICE \
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
docker compose --profile dev run --rm dns-proxy-dev sh -c 'node scripts/setup-config.js setup && tsx --inspect-brk src/main.ts'
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

**Примечание:** В зависимости от версии Docker, команда может быть `docker-compose` (старая версия) или `docker compose` (новая версия, встроенная в Docker CLI). В npm скриптах используется `docker-compose` для совместимости.

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
  -v "$(pwd)/.run-dev.env:/app/.run-dev.env" \
  --env-file .run-dev.env \
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
  -v "$(pwd)/.run-dev.env:/app/.run-dev.env" \
  --env-file .run-dev.env \
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
  -v "$(pwd)/.run-dev.env:/app/.run-dev.env" \
  --env-file .run-dev.env \
  -e NODE_ENV=development \
  dns-proxy-nodejs:dev \
  sh -c "node scripts/setup-config.js setup && tsx --inspect-brk src/main.ts"
```

**PROD режим:**
```bash
# Запуск в foreground (с выводом логов)
docker run --rm \
  --name dns-proxy-prod \
  --network host \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/logs:/app/logs" \
  -v "$(pwd)/scripts:/app/scripts" \
  --env-file .run-prod.env \
  --cap-add NET_BIND_SERVICE \
  --restart always \
  dns-proxy-nodejs:prod

# Запуск в background (daemon) с автоперезапуском
docker run -d \
  --name dns-proxy-prod \
  --network host \
  -v "$(pwd)/config:/app/config" \
  -v "$(pwd)/logs:/app/logs" \
  -v "$(pwd)/scripts:/app/scripts" \
  --env-file .run-prod.env \
  --cap-add NET_BIND_SERVICE \
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
- `--network host` используется для работы с портами 53/5053
- `--restart always` для PROD режима обеспечивает автоматический перезапуск при падении контейнера
- `--restart unless-stopped` для DEV режима перезапускает контейнер, если он не был остановлен вручную
- `--cap-add NET_BIND_SERVICE` необходимо для работы с привилегированным портом 53 в PROD режиме
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
docker-compose -f docker-compose.dev.yml up

# PROD режим
npm run docker:prod:separate
# или
docker-compose -f docker-compose.prod.yml up
```

---

## Решение 3: Один файл с явным указанием сервиса

**Файл:** `docker-compose.yml` (без профилей)

Сервисы запускаются только при явном указании имени сервиса в команде.

### Преимущества:
- Один файл
- Простота

### Недостатки:
- Можно случайно запустить оба сервиса командой `docker-compose up`
- Менее явное разделение

### Использование:

```bash
# DEV режим
docker-compose up dns-proxy-dev

# PROD режим
docker-compose up dns-proxy-prod
```

---

## Рекомендация

**Используйте Решение 1 (Профили)** - это наиболее гибкий и современный подход, который предотвращает случайный запуск обоих режимов, но позволяет запустить их одновременно при необходимости.

---

## Версия Node.js

Все Dockerfile используют `node:20.17-alpine`, что соответствует требованиям:
- Большинство пакетов требуют `>=18`
- Некоторые пакеты требуют `^20.17.0 || >=22.9.0`

Node.js 20.17 LTS полностью совместим с вашими зависимостями.
