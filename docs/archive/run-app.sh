# @DEPRECATED: используйте scripts в package.json, либо Docker
# Этот скрипт устарел и перемещен в docs/archive/ для сохранения истории
#
# sudo setcap 'cap_net_bind_service=+ep' ./run-app.sh
# netstat -antpl | grep ":53\s"

type node
node -v
cd ..
node ./dist/app.js
