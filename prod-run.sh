#!/bin/bash

#
#  --env-file ./env/prod/.env \
#
docker run --rm \
  -p 53:5053/udp \
  -v ./env/prod/config:/app/config \
  -v ./env/prod/logs:/app/logs \
  --name local.dns-proxy-nodejs-prod \
  zvanoz/dns-proxy-nodejs-prod:20260303
