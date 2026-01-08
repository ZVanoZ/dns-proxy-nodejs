# О проекте

"dns-proxy-nodejs" - маленький DNS для использования при разработке сетевых приложений, либо для разруливания DNS запросов при работе через VPN. 

---

## Состояние

Альфа. Функционал работает. Выполняется рефакторинг и тестирование.

---

## Как запустить?

1. Инициализируйте проект:

```shell
npm init -y
```

2. Установите зависимости:

```shell
npm install dns-packet ini
```

3. Запустите:
1. От пользователя root

```shell
sudo node ./app/index.js
```
```shell
node ./app/index.js
```

2. От текущего пользователя
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