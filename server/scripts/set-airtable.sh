#!/bin/sh
# Turn on the Airtable mirror: builds the Responses table, stores the base id and
# token in .env.prod, and recreates the container so it picks them up.
#
# Two ways to run it:
#   on the server:   sh /opt/gps-selector-log/scripts/set-airtable.sh   (prompts; token hidden)
#   piped over ssh:  base id on line 1, token on line 2 of stdin (no prompts). This is
#                    the reliable way from Windows, where pasting into a hidden prompt
#                    inside an ssh session can mangle the token.
set -e
cd /opt/gps-selector-log

if [ -t 0 ]; then
  printf 'Airtable base id (starts with app): '; read BASE
  printf 'Airtable token (hidden): '; stty -echo; read PAT; stty echo; echo
else
  read BASE
  read PAT
fi
# Windows adds invisible bytes (a trailing CR on a paste, a UTF-8 BOM when PowerShell
# pipes), which Airtable rejects. Keep only what ids and tokens are made of.
BASE=$(printf '%s' "$BASE" | tr -cd 'A-Za-z0-9')
PAT=$(printf '%s' "$PAT" | tr -cd 'A-Za-z0-9.')
case "$BASE" in app?????????????? ) ;; *) echo "that does not look like a base id"; exit 1;; esac
[ -n "$PAT" ] || { echo "no token entered"; exit 1; }
echo "token received: ${#PAT} characters, starts $(printf '%s' "$PAT" | cut -c1-4)"

echo "== building the Responses table"
docker compose -f docker-compose.prod.yml run --rm -T -e AIRTABLE_PAT="$PAT" -e AIRTABLE_BASE_ID="$BASE" log node scripts/airtable-setup-table.js </dev/null

echo "== saving to .env.prod"
grep -v '^AIRTABLE_PAT=\|^AIRTABLE_BASE_ID=' .env.prod > .env.prod.new || true
printf 'AIRTABLE_PAT=%s\nAIRTABLE_BASE_ID=%s\n' "$PAT" "$BASE" >> .env.prod.new
chmod 600 .env.prod.new && mv .env.prod.new .env.prod

echo "== recreating the container (it only reads env at creation)"
docker compose -f docker-compose.prod.yml up -d --force-recreate log </dev/null
sleep 12
docker logs selector-log 2>&1 | tail -4
docker exec selector-log wget -qO- http://127.0.0.1:8080/healthz; echo
