#!/bin/bash
#------------------------------------------------------------------------------
#
# Зайти в терминал для проверки внутри
#$ docker run --rm -it --entrypoint sh local.dns-proxy-nodejs-prod:20260303
#$ docker run --rm -it --entrypoint sh dns-proxy-nodejs-dns-proxy-prod:latest
#- $ docker run --rm -it --entrypoint sh zvanoz/dns-proxy-nodejs-prod:20260303
#
#-- Собрать образ, по не выкладывать на dockerhub
#$ IMG_TAG="20260303" IS_BUILD="T" IS_PUSH="F" bash prod-build.sh
#
#-- Не собирать. Выложить на dockerhub то, что в готовом локальном образе.
#$ IMG_TAG="20260303" IS_BUILD="F" IS_PUSH="T" bash prod-build.sh
#
#------------------------------------------------------------------------------

set -e

IMG_TAG="${IMG_TAG:-latest}"
IMG_NAME="zvanoz/dns-proxy-nodejs-prod:${IMG_TAG}"
IS_BUILD="${IS_BUILD:-T}"
IS_PUSH="${IS_PUSH:-F}"


echo "IMG_TAG : '${IMG_TAG}'"
echo "IMG_NAME: '${IMG_NAME}'"
echo "IS_BUILD: '${IS_BUILD}'"
echo "IS_PUSH : '${IS_PUSH}'"



if [ "${IS_BUILD}" = 'T' ];then
  echo '-- BUILD: BEG'
  docker --debug build --progress plain \
    --no-cache \
    --tag "${IMG_NAME}" \
    --file ./env/prod/Dockerfile \
    .
  echo '-- BUILD: END'
else
  echo '-- BUILD: SKIP'
fi

echo "-- Image content:"
docker run --rm -it --entrypoint tree "${IMG_NAME}"

if [ "${IS_PUSH}" = 'T' ];then
  echo '-- PUSH: BEG'
  docker image pull "${IMG_NAME}"
  echo '-- PUSH: END'
else
  echo '-- PUSH: SKIP'
fi