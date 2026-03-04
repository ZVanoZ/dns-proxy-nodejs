#------------------------------------------------------------------------------
# Multi-stage build для DNS Proxy
# Используем Node.js 20 LTS (совместимо с package.json: требует >=20.17.0 или >=22.9.0)
#-----
FROM node:20.17-alpine AS builder

WORKDIR /app

# Копируем исходный код
COPY . .
## Копируем файлы зависимостей
#COPY package*.json ./
#COPY tsconfig.json ./

# Устанавливаем production+dev зависимости т.к. нам нужен модуль "esbuild" для сборки TS -> JS
RUN npm ci

# Собираем приложение
RUN npm run build

#RUN echo '-- STATE: BUILD-DEV' && tree

# Устанавливаем только production зависимости
#COPY package*.json ./
RUN npm ci --only=production

#RUN echo '-- STATE: BUILD-PROD' && tree

#------------------------------------------------------------------------------
# Production образ
#-----
FROM node:20.17-alpine

WORKDIR /app

# Копируем собранное приложение и скрипты
COPY --from=builder /app/dist ./dist
#COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/config/app.ini.dist ./config/
COPY --from=builder /app/scripts ./scripts

RUN echo '-- STATE: IMAGE-PROD' && tree

# Создаем пользователя без фиксированного GID/UID (система назначит свободные значения)
RUN addgroup -S appuser && \
    adduser -S -G appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

# Открываем порт для PROD (внутри контейнера работает на 5053, маппится на 53 на хосте)
EXPOSE 5053/udp

# Запуск приложения
CMD ["node", "dist/app.js"]
