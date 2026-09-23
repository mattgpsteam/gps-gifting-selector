'use strict';

const { toFields, shouldMirror } = require('./fields');

/**
 * Mirrors SQLite rows into Airtable, upserting on "Session ID".
 *
 * Durable by construction: the work queue is the `synced_seq < seq` rows in
 * SQLite, not memory. A restart, an Airtable outage, or a token that is not set
 * yet only delays the mirror. When it comes back, everything unsynced goes, in
 * batches of 10 (Airtable's per-request cap), paced under its 5 req/s limit.
 */
const BATCH = 10;
const PACE_MS = 250;
const IDLE_MS = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeMirror(store, cfg, log = console) {
  const enabled = !!(cfg.pat && cfg.baseId && cfg.table);
  let stopped = false;
  let backoff = 0;

  async function pushBatch(rows) {
    const url = `https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(cfg.table)}`;
    const res = await (cfg.fetch || fetch)(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cfg.pat}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: ['Session ID'] },
        typecast: true,
        records: rows.map((r) => ({ fields: toFields(r) })),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Airtable ${res.status}: ${body.slice(0, 300)}`);
      err.status = res.status;
      err.retryAfter = Number(res.headers.get('retry-after')) || 0;
      throw err;
    }
  }

  /** One pass. Returns how many rows it synced. Exposed for tests. */
  async function tick() {
    const pending = store.pending(BATCH);
    if (!pending.length) return 0;
    // Anonymous drop-offs are not worth a row in Airtable: mark them done here.
    // If the same visitor later submits the form, their seq moves past synced_seq
    // and the row comes back through as a lead.
    const rows = pending.filter(shouldMirror);
    for (const r of pending) if (!shouldMirror(r)) store.markSynced(r.sessionId, r.seq);
    if (!rows.length) return pending.length;
    try {
      await pushBatch(rows);
      for (const r of rows) store.markSynced(r.sessionId, r.seq);
      return rows.length;
    } catch (e) {
      if (e.status !== 422 || schemaProblem(e)) throw e;
    }
    // A 422 on a value (say, an email Airtable won't accept) is about one row.
    // Retry them singly so the rest still sync; skip only the row that fails on
    // its own. It stays in SQLite, and the log names it.
    for (const r of rows) {
      try {
        await pushBatch([r]);
      } catch (e) {
        if (e.status !== 422 || schemaProblem(e)) throw e;
        log.error(`airtable rejected session ${r.sessionId} seq ${r.seq}, skipping (kept in SQLite): ${e.message}`);
      }
      store.markSynced(r.sessionId, r.seq);
      await sleep(PACE_MS);
    }
    return rows.length;
  }

  // Missing column / wrong table / bad token scope: every row would fail, so this
  // must halt the mirror, not skip rows.
  function schemaProblem(e) {
    return /UNKNOWN_FIELD_NAME|TABLE_NOT_FOUND|INVALID_PERMISSIONS|NOT_FOUND|AUTHENTICATION/.test(e.message);
  }

  async function run() {
    if (!enabled) {
      log.log('airtable mirror OFF (AIRTABLE_PAT/BASE_ID/TABLE not all set) — rows stay in SQLite until it is');
      return;
    }
    log.log(`airtable mirror ON -> ${cfg.baseId}/${cfg.table}`);
    while (!stopped) {
      try {
        const n = await tick();
        backoff = 0;
        await sleep(n ? PACE_MS : IDLE_MS);
      } catch (e) {
        // 422 = a field/schema mismatch: retrying won't fix it, but the rows are safe
        // in SQLite, so back off hard and keep logging until someone fixes the table.
        backoff = Math.min(backoff ? backoff * 2 : 2000, e.status === 422 ? 300000 : 60000);
        log.error(`airtable sync failed, retrying in ${Math.round(backoff / 1000)}s: ${e.message}`);
        await sleep(Math.max(backoff, e.retryAfter * 1000));
      }
    }
  }

  return { enabled, tick, run, stop: () => { stopped = true; } };
}

module.exports = { makeMirror };
