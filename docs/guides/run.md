# Руководство по запуску DNS-прокси

## Быстрый старт

### Docker (рекомендуется)

**DEV режим:**
```bash
npm run docker:dev
```

**PROD режим:**
```bash
npm run docker:prod
```

### Локальный запуск

**DEV режим:**
```bash
npm install
npm run dev
```

**PROD режим:**
```bash
npm install
npm run prod:tsx
```

---

## Варианты запуска

### 1. Запуск через Docker (РЕКОМЕНДУЕТСЯ)

Docker - самый простой способ запуска приложения. Подробные инструкции см. в [DOCKER-OPTIONS.md](../DOCKER-OPTIONS.md).

#### Быстрый старт через npm:

**DEV режим:**
```bash
npm run docker:dev      # Запуск DEV
npm run docker:dev:down # Остановка и удаление контейнера
```

**PROD режим:**
```bash
npm run docker:prod     # Запуск PROD (с автоперезапуском)
npm run docker:stop     # Остановка
npm run docker:logs     # Просмотр логов
```

#### Через docker compose:

**DEV режим:**
```bash
docker compose --profile dev up dns-proxy-dev    # Запуск DEV
docker compose --profile dev down dns-proxy-dev # Остановка
```

**PROD режим:**
```bash
docker compose --profile prod up dns-proxy-prod # Запуск PROD (с автоперезапуском)
docker compose --profile prod stop dns-proxy-prod # Остановка
```

> **Важно:** PROD режим настроен с `restart: always` для автоматического перезапуска при падении контейнера.

### 2. Запуск из исходников

#### DEV режим

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Запуск:**
   
   Без отладчика:
   ```bash
   npm run dev
   ```
   
   С отладчиком:
   ```bash
   npm run dev:debug
   ```

3. **Проверка:**
   ```bash
   nslookup -retry=0 -port=5053 google.com 127.0.0.1
   ```

#### PROD режим

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Настройте проброс запросов с порта 53 на 5053 (опционально):**
   
   Если вы хотите использовать стандартный порт 53, настройте iptables:
   ```bash
   # Добавление правил проброса порта 53 на 5053 для UDP
   sudo iptables -t nat -A PREROUTING -p udp --dport 53 -j REDIRECT --to-port 5053
   sudo iptables -t nat -A OUTPUT -p udp --dport 53 -j REDIRECT --to-port 5053
   
   # Сохранение правил
   sudo mkdir -p /etc/iptables
   sudo iptables-save | sudo tee /etc/iptables/rules.v4
   ```
   
   Для отката правил:
   ```bash
   sudo iptables -t nat -D PREROUTING -p udp --dport 53 -j REDIRECT --to-port 5053
   sudo iptables -t nat -D OUTPUT -p udp --dport 53 -j REDIRECT --to-port 5053
   sudo iptables-save | sudo tee /etc/iptables/rules.v4
   ```
   
   Подробнее о настройке портов в Linux см. [linux-setup.md](linux-setup.md).

3. **Запуск:**
   ```bash
   npm run prod:tsx
   ```

4. **Проверка:**
   
   Для порта 5053:
   ```bash
   nslookup -retry=0 -port=5053 google.com 127.0.0.1
   ```
   
   Для порта 53 (если настроен iptables):
   ```bash
   nslookup -retry=0 google.com 127.0.0.1
   ```

### 3. Запуск скомпилированного приложения

1. **Соберите проект:**
   ```bash
   npm run build
   ```

2. **Запуск:**
   ```bash
   npm start
   # или
   cd dist && node app.js
   ```

> **Примечание:** Для запуска на порту 53 может потребоваться настройка прав доступа. См. [linux-setup.md](linux-setup.md).

---

## Подготовка окружения

### Для Docker Compose

1. **Создайте файл `.env` в корне проекта:**
   ```bash
   cp .env.dist .env
   ```

2. **Настройте IP адреса контейнеров (опционально):**
   Отредактируйте `.env` файл:
   ```bash
   # IP адрес контейнера DEV режима
   DEV_SERVER_IP=192.168.13.133

   # IP адрес контейнера PROD режима
   PROD_SERVER_IP=192.168.13.13

   # Подсеть для Docker bridge network
   NETWORK_SUBNET=192.168.13.0/24
   ```

### Для DEV режима

1. **Создайте конфигурационный файл:**
   ```bash
   cp env/dev/config/app.ini.dist env/dev/config/app.ini
   ```

2. **Создайте файл переменных окружения:**
   ```bash
   cp env/dev/dist.run-dev.env env/dev/.env
   ```

### Для PROD режима

1. **Создайте конфигурационный файл:**
   ```bash
   cp env/prod/config/app.ini.dist env/prod/config/app.ini
   ```

2. **Создайте файл переменных окружения:**
   ```bash
   cp env/prod/dist.run-prod.env env/prod/.env
   ```

---

## Детальные инструкции

### Docker Compose профили

Проект использует профили Docker Compose для разделения DEV и PROD режимов. Это позволяет запускать только нужный режим и предотвращает случайный запуск обоих одновременно.

**Преимущества:**
- Один файл конфигурации
- Встроенная поддержка в Docker Compose
- Гибкость: можно запустить оба профиля одновременно при необходимости
- Простота использования

Подробнее см. [DOCKER-OPTIONS.md](../DOCKER-OPTIONS.md).

### Настройка портов

**DEV режим:**
- Порт внутри контейнера: 53
- Порт на хосте: 5053
- Маппинг: `5053:53/udp`

**PROD режим:**
- Порт внутри контейнера: 5053
- Порт на хосте: 53
- Маппинг: `53:5053/udp`

### Проверка работоспособности

**PROD режим (через Docker):**
```bash
# Используйте фиксированный IP контейнера
nslookup google.com 192.168.13.13
```

**DEV режим (через Docker):**
```bash
# Используйте фиксированный IP контейнера
nslookup -port=5053 google.com 192.168.13.133
```

**Локальный запуск (без Docker):**
```bash
nslookup google.com 127.0.0.1
nslookup -port=5053 google.com 127.0.0.1
nslookup -retry=0 -port=5053 my-invalid-host.local 127.0.0.1
```

> **Примечание:** При использовании Docker с bridge network запросы к `127.0.0.1` могут не работать. Используйте фиксированные IP адреса контейнеров: `192.168.13.13` (PROD) или `192.168.13.133` (DEV). Подробнее см. [DOCKER-OPTIONS.md](../DOCKER-OPTIONS.md).

### Диагностика проблем

**Проверка запущенных контейнеров:**
```bash
docker ps | grep dns-proxy
```

**Просмотр логов:**
```bash
# PROD режим
npm run docker:logs

# DEV режим
npm run docker:logs:dev
```

**Проверка портов:**
```bash
# Список сервисов, которые используют порт 53
sudo netstat -antupl | grep ":53\s"
```

**Если `nslookup` возвращает timeout:**
1. Проверьте, запущен ли контейнер: `docker ps | grep dns-proxy-prod`
2. Проверьте порты контейнера: `docker compose --profile prod config | grep -A3 ports:`
3. Используйте фиксированный IP контейнера вместо `127.0.0.1`

---

## Дополнительные ресурсы

- [Настройка Linux для запуска на порту 53](linux-setup.md)
- [Варианты конфигурации Docker](../DOCKER-OPTIONS.md)
- [Документация DNS протокола](../reference/dns/README.md)
