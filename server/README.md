# selector-log

Logs every Gifting Program Selector visitor, including the drop-offs, and the lead
form at the end. SQLite is the record; Airtable is a mirror of it.

## How a response gets here

1. The page gives each visitor a session id. After every answer, and once more
   when the lead form is submitted, it queues a **full snapshot** (answers so
   far, recommendation once known, lead if any) in a `localStorage` outbox.
2. The outbox posts to `POST /selector/api/responses`. No network (a casino
   floor, a USB-stick demo), and it waits: it retries on reconnect and every 30s.
   It clears an item only when this service answers `{ ok: true }`.
3. This service keeps one row per session. A snapshot replaces the stored one
   only if its `seq` is higher, so late or repeated replays can't roll a row
   back, and a submitted lead is never erased. Every post also lands in an
   append-only `events` table.
4. A background loop upserts changed rows into Airtable on `Session ID`,
   10 per request, under Airtable's rate limit. The queue is SQLite itself
   (`synced_seq < seq`), so a restart, an Airtable outage, or a token that isn't
   set yet only delays the mirror. Nothing is lost.

The result is never held hostage to the network: the page unlocks on a valid
form whether or not the post has gone through.

## Airtable

One table, `Responses`. Columns are defined once in `src/fields.js`; the mirror
and the setup script both read it, so they can't drift.

`Status` is `In progress` (dropped off mid-questions), `Reached form` (saw the
gate, didn't fill it in) or `Lead submitted`.

Setup, once:

1. In Airtable, create an empty base, e.g. **GPS Gifting Selector**. Keep it
   separate from the competitive-intel base: this one holds lead PII.
2. Create a personal access token scoped to **that base only**, with
   `data.records:write`, `schema.bases:read`, `schema.bases:write`.
3. Build the table (idempotent, safe to re-run):
   `AIRTABLE_PAT=... AIRTABLE_BASE_ID=app... node scripts/airtable-setup-table.js`
4. Put `AIRTABLE_PAT` and `AIRTABLE_BASE_ID` in the server's `.env.prod`, then
   **recreate** the container (`up -d --force-recreate log`). A running
   container does not see env edits.

Rows logged before the token was set sync on their own once it is.

## API

`POST /api/responses` (public: the page is). Body `{ "responses": [ ... ] }`,
1–50 items, 128 KB max. Each item is validated on its own: unknown questions,
results or tradeshows are refused, everything is length-capped. The reply
is `{ ok, stored, rejected }`. CORS is limited to `ALLOWED_ORIGINS` (the
Pages domain, and `null` for the page opened from a file). Rate limit is 240
posts/min per client IP.

`GET /healthz` returns `{ ok, responses, leads, unsynced }`.

## Deploy

Same box and pattern as the Big Deal counter: its own compose project on the
design-kiosk docker network, routed by that stack's Caddy.

```
# on 167.233.152.3
mkdir -p /opt/gps-selector-log /mnt/gps-data/selector-log
chown 1000:1000 /mnt/gps-data/selector-log        # the container runs as node (1000)
# copy server/ into /opt/gps-selector-log, create .env.prod from .env.prod.example (chmod 600)
cd /opt/gps-selector-log && docker compose -f docker-compose.prod.yml up -d --build
```

Caddy (`/opt/gps-design-kiosk/Caddyfile`, inside the design-kiosk site block;
use `handle`, not `route`, to join the existing SPA catch-all group):

```
handle_path /selector/* {
	reverse_proxy selector-log:8080
}
```

Then recreate caddy (a single-file bind mount pins the inode, so `caddy reload`
alone reads the old file):
`docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --force-recreate caddy`

## Tests

`node --test "test/*.test.js"` (Node 24, no install).
