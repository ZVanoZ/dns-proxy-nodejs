# О проекте

"dns-proxy-nodejs" - маленький DNS для использования при разработке сетевых приложений, либо для разруливания DNS запросов при работе через VPN. 

Аналоги приложения [analogs.md](docs/analogs.md)

---

## Состояние

Альфа. Функционал работает. Выполняется рефакторинг и тестирование.

* Задачи
  * Список [index.md](docs/tasks/index.md)
  * Правила для `vanzan01/cursor-memory-bank` v0.8 [rules.md](docs/tasks/rules.md)
  * Инструкция: Добавление задач в план используя методологию vanzan01/cursor-memory-bank v0.8 [index.md](docs/reference/task-management/index.md)
* `vanzan01/cursor-memory-bank` v0.8
  * Прогресс [progress.md](memory-bank/progress.md)
  * Активная задача [activeContext.md](memory-bank/activeContext.md)
  * Список задач [tasks.md](memory-bank/tasks.md)

---

## Возможности

### Кеширование DNS-запросов

DNS-прокси поддерживает кеширование DNS-запросов с использованием LRU (Least Recently Used) алгоритма:

- **Автоматическое кеширование** ответов от upstream DNS-серверов
- **Учет TTL** из DNS-ответов для корректного времени жизни записей
- **Отрицательное кеширование** (NXDOMAIN) с коротким TTL
- **Защита от утечек памяти** через ограничение размера кеша и LRU эвакуацию
- **Статистика использования** кеша (hits, misses, evictions)

Настройка кеша выполняется через секцию `[dns-cache]` в файле конфигурации `app.ini`:

```ini
[dns-cache]
enabled=true          # Включить/выключить кеширование
max-size=1000         # Максимальный размер кеша (количество записей)
max-ttl=86400         # Максимальный TTL в секундах (защита от очень больших TTL)
negative-ttl=60       # TTL для отрицательного кеша (NXDOMAIN) в секундах
```

### Логирование источников ответов

В логи приложения добавлена структура `answer-source`, которая показывает источник каждого DNS-ответа:

```json
{
  "answer-source": {
    "masked-dns": "company-dns",  // Значение из секции [masked-dns] конфига
    "real-source": "cache"        // "cache" - из кеша, "hosts" - из [hosts], "ip:port" - upstream DNS
  }
}
```

**Возможные значения `real-source`:**
- `"cache"` - ответ взят из кеша DNS-запросов
- `"hosts"` - ответ взят из секции `[hosts]` конфигурации
- `"ip:port"` - ответ получен от upstream DNS-сервера (например, `"1.1.1.1:53"`)

**Значение `masked-dns`:**
- Содержит название цепочки DNS-серверов из секции `[masked-dns]` (например, `"company-dns"`, `"inet-dns"`)
- `null` для ответов из `[hosts]` или кеша без определенной маски

---

---

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

## Документация

### Руководства

- [Руководство по запуску](docs/guides/run.md) - подробные инструкции по запуску приложения
- [Настройка Linux](docs/guides/linux-setup.md) - запуск на порту 53 без sudo
- [Варианты конфигурации Docker](docs/DOCKER-OPTIONS.md) - детальная информация о Docker

### Справочники

- [Документация DNS протокола](docs/reference/dns/README.md) - техническая документация по DNS

### Для разработчиков

- [Использование vanzan01/cursor-memory-bank](memory-bank/workflow.md) - методология работы с проектом
- [История разработки](docs/development/history.md) - исторические команды создания проекта

---