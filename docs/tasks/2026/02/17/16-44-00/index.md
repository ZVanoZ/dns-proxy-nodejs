# Задача: task20260217164400

**Номер задачи:** task20260217164400  
**Дата создания:** 2026-02-17 16:44:00  
**Статус:** 

## Описание задачи

Нужно разобраться с диагностикой окружения IPv6.
1. Добавить диагностические команды в документацию.
2. Создать unit-тесты для проверки доступна ли работа с IPv6 на текущем хосте.
3. Добавить unit-тесты для диагностики правильно ли работает "dns-proxy-nodejs" с IPv6.

## Контекст задачи

В интернете есть хосты, которые работают только по IPv6 (Например "ipv6.google.com").

* Диагностика через ping.
```shell
ping ipv6.google.com
```
Вывод в консоль
```text
ping: connect: Сеть недоступна
```

* Диагностика через nslookup и cloudflare по IPv4
```shell
nslookup  ipv6.google.com 1.1.1.1
```
Вывод в консоль
```text
Server:         1.1.1.1
Address:        1.1.1.1#53

Non-authoritative answer:
ipv6.google.com canonical name = ipv6.l.google.com.
Name:   ipv6.l.google.com
Address: 2a00:1450:4025:804::66
Name:   ipv6.l.google.com
Address: 2a00:1450:4025:804::64
Name:   ipv6.l.google.com
Address: 2a00:1450:4025:804::8a
Name:   ipv6.l.google.com
Address: 2a00:1450:4025:804::71
```

* Диагностика через nslookup и cloudflare по IPv6
```shell
nslookup  ipv6.google.com 2606:4700:4700::1111
```
Вывод в консоль
```text
;; UDP setup with 2606:4700:4700::1111#53(2606:4700:4700::1111) for ipv6.google.com failed: network unreachable.
;; no servers could be reached
```

* Диагностика через nslookup и сервис "dns-proxy-prod" из [docker-compose.yml](../../../../../../docker-compose.yml) по IPv4
```shell
nslookup  ipv6.google.com 192.168.13.13
```
Вывод в консоль 
```text
;; Warning: query response not set
Server:         192.168.13.13
Address:        192.168.13.13#53

ipv6.google.com canonical name = ipv6.l.google.com.
** server can't find ipv6.l.google.com: FORMERR
```
Вывод в лог
```json
{"level":40,"time":"2026-02-17T15:22:57.000Z","pid":1,"hostname":"9f98ea751051","answer":{"type":"Buffer","data":[233,52,128,1,0,1,0,0,0,0,0,0,4,105,112,118,54,1,108,6,103,111,111,103,108,101,3,99,111,109,0,0,28,0,1]},"remoteInfo":{"address":"192.168.13.1","family":"IPv4","port":49640,"size":35},"questionName":"ipv6.l.google.com","serverInterface":{"ip":"0.0.0.0","port":53,"family":"IPv4"},"msg":"App.sendErrorResponse:[answer]"}
```

* Диагностика через nslookup и сервис "dns-proxy-prod" из [docker-compose.yml](../../../../../../docker-compose.yml) по IPv6
```shell
nslookup  ipv6.google.com fd00:0:0:1::13
```
Вывод в консоль
```text
;; Warning: query response not set
Server:         fd00:0:0:1::13
Address:        fd00:0:0:1::13#53

ipv6.google.com canonical name = ipv6.l.google.com.
** server can't find ipv6.l.google.com: FORMERR
```
Вывод в лог
```json
{"level":40,"time":"2026-02-17T14:42:44.870Z","pid":1,"hostname":"9f98ea751051","answer":{"type":"Buffer","data":[128,32,128,1,0,1,0,0,0,0,0,0,4,105,112,118,54,1,108,6,103,111,111,103,108,101,3,99,111,109,0,0,28,0,1]},"remoteInfo":{"address":"fd00:0:0:1::1","family":"IPv6","port":52235,"size":35},"questionName":"ipv6.l.google.com","serverInterface":{"ip":"::","port":53,"family":"IPv6"},"msg":"App.sendErrorResponse:[answer]"}
```

* Диагностика через curl по IPv4
```shell
curl -4 https://registry-1.docker.io/v2/ 
```
Вывод в консоль
```text
{"errors":[{"code":"UNAUTHORIZED","message":"authentication required","detail":null}]}
```

* Диагностика через curl по IPv6
```shell
curl -6 https://registry-1.docker.io/v2/ 
```
Вывод в консоль
```text
curl: (7) Failed to connect to registry-1.docker.io port 443 after 10368 ms: Couldn't connect to server
```
* 
* Диагностика через dig по IPv6
```shell
dig AAAA ipv6.google.com
```
Вывод в консоль
```text
;; Warning: query response not set

; <<>> DiG 9.18.44-1~deb12u1-Debian <<>> AAAA ipv6.google.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 5340
;; flags: aa; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
; COOKIE: dccc59d7502dbd11 (echoed)
;; QUESTION SECTION:
;ipv6.google.com.               IN      AAAA

;; ANSWER SECTION:
ipv6.google.com.        288     IN      CNAME   ipv6.l.google.com.

;; Query time: 4 msec
;; SERVER: 192.168.13.13#53(192.168.13.13) (UDP)
;; WHEN: Tue Feb 17 18:34:21 EET 2026
;; MSG SIZE  rcvd: 102
```