# Задача: task20260303172400

**Номер задачи:** task20260304105600  
**Дата создания:** 2026-03-04 10:56:00  
**Статус:**

## Описание задачи

1. В данный момент сборка Docker образа (PROD) для выкатывания на dockerhub выполняется, но сам образ не рабочий.
```shell
$ docker run --rm \
  -p 53:5053/udp \
  -v ./env/prod/config:/app/config \
  -v ./env/prod/logs:/app/logs \
  --name local.dns-proxy-nodejs-prod \
  zvanoz/dns-proxy-nodejs-prod:20260303
(node:1) Warning: To load an ES module, set "type": "module" in the package.json or use the .mjs extension.
(Use `node --trace-warnings ...` to show where the warning was created)
/app/dist/app.js:15
import dgram from "node:dgram";
^^^^^^

SyntaxError: Cannot use import statement outside a module
    at wrapSafe (node:internal/modules/cjs/loader:1378:20)
    at Module._compile (node:internal/modules/cjs/loader:1428:41)
    at Module._extensions..js (node:internal/modules/cjs/loader:1548:10)
    at Module.load (node:internal/modules/cjs/loader:1288:32)
    at Module._load (node:internal/modules/cjs/loader:1104:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:174:12)
    at node:internal/main/run_main_module:28:49

Node.js v20.17.0
```
2. Контекстные файлы для сборки:
```text
prod-build.sh
prod-run.sh
env/prod/Dockerfile
```

