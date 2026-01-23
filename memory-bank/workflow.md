# Использование "vanzan01/cursor-memory-bank" в проекте

## Инициализация

### 1. Копирование базовых файлов

```bash
git clone https://github.com/vanzan01/cursor-memory-bank.git ./tmp/cursor-memory-bank
cp -vR ./tmp/cursor-memory-bank/.cursor/* ./.cursor/
```

### 2. Инициализация "vanzan01/cursor-memory-bank"

1. Откройте новый чат AI в режиме "Agent"
2. Введите команду `/van` и нажмите запустить

В результате создается папка `./memory-bank/` со следующим содержимым:

```
ls -l ./memory-bank/
итого 44
-rw-r--r-- 1 ivan ivan  799 янв 14 17:46 activeContext.md
drwxr-xr-x 2 ivan ivan 4096 янв 14 17:45 archive
drwxr-xr-x 2 ivan ivan 4096 янв 14 17:45 creative
-rw-r--r-- 1 ivan ivan 1754 янв 14 17:46 productContext.md
-rw-r--r-- 1 ivan ivan  953 янв 14 17:46 progress.md
-rw-r--r-- 1 ivan ivan 1943 янв 14 17:46 projectbrief.md
drwxr-xr-x 2 ivan ivan 4096 янв 14 17:45 reflection
-rw-r--r-- 1 ivan ivan 1715 янв 14 17:46 style-guide.md
-rw-r--r-- 1 ivan ivan 2536 янв 14 17:46 systemPatterns.md
-rw-r--r-- 1 ivan ivan  438 янв 14 17:46 tasks.md
-rw-r--r-- 1 ivan ivan 2139 янв 14 17:46 techContext.md
```

## Структура Memory Bank

- `tasks.md` - текущая задача и план реализации
- `activeContext.md` - активный контекст работы
- `projectbrief.md` - краткое описание проекта
- `progress.md` - прогресс реализации
- `productContext.md` - контекст продукта
- `systemPatterns.md` - архитектурные паттерны
- `techContext.md` - технический контекст
- `style-guide.md` - руководство по стилю кода
- `archive/` - архив завершенных задач
- `creative/` - творческие решения и дизайн
- `reflection/` - рефлексия по завершенным задачам

## Работа с задачами

Список задач находится в `docs/tasks/index.md`. Для работы с задачами используйте команды:

- `/van <task_id>` - инициализация задачи
- `/plan` - планирование задачи
- `/build` - реализация задачи
- `/reflect` - рефлексия по задаче
- `/archive` - архивирование задачи

Подробнее см. [Инструкция по добавлению задач в план](docs/reference/task-management/index.md).
