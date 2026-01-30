# Multi-stage build для DNS Proxy
# Используем Node.js 20 LTS (совместимо с package.json: требует >=20.17.0 или >=22.9.0)
FROM node:20.17-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY tsconfig.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production образ
FROM node:20.17-alpine

WORKDIR /app

# Устанавливаем только production зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем собранное приложение и скрипты
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY --from=builder /app/scripts ./scripts

# Создаем пользователя без фиксированного GID/UID (система назначит свободные значения)
RUN addgroup -S appuser && \
    adduser -S -G appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

# Открываем порт для PROD (внутри контейнера работает на 5053, маппится на 53 на хосте)
EXPOSE 5053/udp

# Запуск приложения
CMD ["node", "dist/app.js"]
