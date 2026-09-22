#!/bin/sh
# Turn on the Airtable mirror. Run on the server:  sh /opt/gps-selector-log/scripts/set-airtable.sh
# Asks for the base id and token (the token is not echoed), builds the Responses
# table, stores both in .env.prod, and recreates the container so it picks them up.
set -e
cd /opt/gps-selector-log
printf 'Airtable base id (starts with app): '; read BASE
case "$BASE" in app?????????????? ) ;; *) echo "that does not look like a base id"; exit 1;; esac
printf 'Airtable token (hidden): '; stty -echo; read PAT; stty echo; echo
[ -n "$PAT" ] || { echo "no token entered"; exit 1; }

echo "== building the Responses table"
docker compose -f docker-compose.prod.yml run --rm -e AIRTABLE_PAT="$PAT" -e AIRTABLE_BASE_ID="$BASE" log node scripts/airtable-setup-table.js

echo "== saving to .env.prod"
grep -v '^AIRTABLE_PAT=\|^AIRTABLE_BASE_ID=' .env.prod > .env.prod.new || true
printf 'AIRTABLE_PAT=%s\nAIRTABLE_BASE_ID=%s\n' "$PAT" "$BASE" >> .env.prod.new
chmod 600 .env.prod.new && mv .env.prod.new .env.prod

echo "== recreating the container (it only reads env at creation)"
docker compose -f docker-compose.prod.yml up -d --force-recreate log
sleep 12
docker logs selector-log 2>&1 | tail -4
docker exec selector-log wget -qO- http://127.0.0.1:8080/healthz; echo
