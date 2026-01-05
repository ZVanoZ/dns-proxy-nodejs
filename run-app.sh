#
# sudo setcap 'cap_net_bind_service=+ep' ./run-app.sh
# netstat -antpl | grep ":53\s"

type node
node -v
node ./app/index.js