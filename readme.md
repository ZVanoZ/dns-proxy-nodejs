# О проекте

"dns-proxy-nodejs" - маленький DNS для использования при разработке сетевых приложений, либо для разруливания DNS запросов при работе через VPN. 

Аналоги приложения [analogs.md](docs/analogs.md)

---

## Состояние

Альфа. Функционал работает. Выполняется рефакторинг и тестирование.

* Прогресс [progress.md](memory-bank/progress.md)
* Активная задача [activeContext.md](memory-bank/activeContext.md)
* Список задач [tasks.md](memory-bank/tasks.md)

---

## Как запустить?

Есть несколько вариантов запуска.
1. Запуск скомпилированного приложения из папки "./dist"
2. Запуск из исходников в режиме PROD
3. Запуск из исходников в режиме DEV
4. Запуск через Docker или "docker compose" - см. [DOCKER-OPTIONS.md](DOCKER-OPTIONS.md).

Перед запуском подготовить:
* Для DEV режима: создать "env/dev/config/app.ini" на основе "env/dev/config/app.ini.dist"
* Для PROD режима: создать "env/prod/config/app.ini" на основе "env/prod/config/app.ini.dist"
* .run-prod.env из dist.run-prod.env для режима PROD
* .run-dev.env из dist.run-dev.env для режима DEV 

---

* Запуск из исходников в режиме DEV

1. Установите зависимости:

```shell
npm install
```

2. Запуск

DEV без пошагового отладчика
```sh
npm run dev
```

DEV с пошаговым отладчиком
```sh
npm run dev:debug
```

3. Проверка

```shell
nslookup -retry=0 -port=5053 google.com 127.0.0.1
```

---

* Запуск из исходников в режиме PROD

1. Установите зависимости:

```shell
npm install
```

2. Настройте проброс запросов с порта 53 на 5053

```shell
# Проверка текущих правил iptables
sudo iptables -t nat -L -n -v

# Добавление правил проброса порта 53 на 5053 для UDP
# Примечание: TCP не требуется, так как DNS-proxy работает только с UDP
sudo iptables -t nat -A PREROUTING -p udp --dport 53 -j REDIRECT --to-port 5053

# Для локальных подключений (127.0.0.1)
sudo iptables -t nat -A OUTPUT -p udp --dport 53 -j REDIRECT --to-port 5053

# Сохранение правил
# Вариант 1: Прямое сохранение в файл (работает везде)
sudo mkdir -p /etc/iptables
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# Вариант 2: Если установлен netfilter-persistent (Ubuntu/Debian)
# sudo apt-get install iptables-persistent
# sudo netfilter-persistent save

# Вариант 3: Для автоматической загрузки правил при загрузке системы
# можно добавить в /etc/rc.local или создать systemd service
```

* Откат
```shell
# 1. Удаление активных правил
# Удаление правила для внешних пакетов (PREROUTING)
sudo iptables -t nat -D PREROUTING -p udp --dport 53 -j REDIRECT --to-port 5053

# Удаление правила для локальных пакетов (OUTPUT)
sudo iptables -t nat -D OUTPUT -p udp --dport 53 -j REDIRECT --to-port 5053

# 2. Обновление сохраненной конфигурации
sudo iptables-save | sudo tee /etc/iptables/rules.v4

#Если вы хотите вообще удалить этот файл и папку (если они вам больше не нужны):
#sudo rm /etc/iptables/rules.v4
#sudo rmdir /etc/iptables


# 3. Проверка результата
# Убедитесь, что в таблице nat больше нет редиректов на порт 5053:
sudo iptables -t nat -L -n -v
```

3. Запуск

PROD без пошагового отладчика
```sh
npm run prod:tsx
```

4. Проверка

Для не привилегированного порта 5053. 
```shell
nslookup -retry=0 -port=5053 google.com 127.0.0.1
```

Для стандартного порта 53.
```shell
nslookup -retry=0 google.com 127.0.0.1
```

---

* Запуск скомпилированного приложения

1. От пользователя root, если приложение запускается на порту 53 и не заморачиваемся с выдачей прав

@TODO: проверить актуальность информации

```shell
sudo node ./app/index.js
```
```shell
node ./app/index.js
```

2. От текущего пользователя, с выдачей привилегий через setcap

@TODO: проверить актуальность информации

@WARN: setcap работает только с elf-файлами. В *.sh нет заголовка, где можно установить бит прав.

   ```bash
   ls -la run-app.sh
   ```
   ```bash 
   sudo setcap 'cap_net_bind_service=+ep' run-app.sh
   ```
   ```bash
   bash run-app.sh
   ```

---

* Список сервисов, которые используют порт 53

```shell
sudo netstat -antupl | grep ":53\s"
```
```shell
sudo netstat -antupl | grep ":.*53.*\s"
```

---

* Проверка работоспособности

```shell
nslookup google.com 127.0.0.1
```

```shell
nslookup -port=5053 google.com 127.0.0.1
```

```shell
nslookup -retry=0 -port=5053 my-invalid-host.local 127.0.0.1
```

---

## Использование "vanzan01/cursor-memory-bank" в проекте

1. Копируем базовые файлы
```text
git clone https://github.com/vanzan01/cursor-memory-bank.git ./tmp/cursor-memory-bank
cp -vR ./tmp/cursor-memory-bank/.cursor/* ./.cursor/
```
2. Инициализируем  "vanzan01/cursor-memory-bank"
```text
* Открываем новый чат AI в режиме "Agent"
* Вбиваем текст "/van" и нажимаем запустить
```
В результате, создается папка ./memory-bank](memory-bank) с таким содержимым
```text
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




---

## RAW

```bash
# Инициализация TS
npm init -y
npm install dns-packet ini
npm install --save-dev typescript @types/node @types/dns-packet @types/ini ts-node
# Создание конфига TS
npx tsc --init
```

---