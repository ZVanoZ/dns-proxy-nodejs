/**
 * Форматтер для перестановки полей лога в нужном порядке:
 * 1. level (число)
 * 2. time (строка)
 * 3. pid (число)
 * 4. hostname (строка)
 * 5. msg (строка)
 * 6. context (объект - все остальные поля)
 */
export function formatLogObject(object: any): any {
  // Извлекаем стандартные поля Pino
  const {
    level,
    time,
    pid,
    hostname,
    msg,
    ...context
  } = object;

  // Создаем новый объект с нужным порядком полей
  // Используем Object.assign для гарантии порядка
  const formatted: any = {};

  // 1. level
  if (level !== undefined) {
    formatted.level = level;
  }

  // 2. time
  if (time !== undefined) {
    formatted.time = time;
  }

  // 3. pid
  if (pid !== undefined) {
    formatted.pid = pid;
  }

  // 4. hostname
  if (hostname !== undefined) {
    formatted.hostname = hostname;
  }

  // 5. msg
  if (msg !== undefined) {
    formatted.msg = msg;
  }

  // 6. context (все остальные поля) - добавляем по одному для сохранения порядка
  for (const key in context) {
    if (context.hasOwnProperty(key)) {
      formatted[key] = context[key];
    }
  }

  return formatted;
}
