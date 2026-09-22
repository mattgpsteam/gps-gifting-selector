'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

/**
 * SQLite is the system of record; Airtable is a mirror of it.
 *
 * `responses` holds one row per visitor: the newest snapshot the page sent.
 * `events` keeps every post as it arrived, so a drop-off question can still be
 * answered after the snapshot has moved on.
 *
 * The page's outbox can replay posts late and out of order, so a snapshot only
 * replaces the stored one when its seq is higher, and (session, seq) is the
 * dedupe key for the event log.
 */
function open(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = FULL'); // a lead is worth an fsync
  db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
      session_id  TEXT PRIMARY KEY,
      seq         INTEGER NOT NULL,
      started_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      snapshot    TEXT NOT NULL,              -- JSON, the page's latest payload
      lead        TEXT,                       -- JSON, sticky once submitted
      synced_seq  INTEGER NOT NULL DEFAULT 0, -- last seq written to Airtable
      received_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS responses_unsynced_idx ON responses(synced_seq, seq);

    CREATE TABLE IF NOT EXISTS events (
      session_id  TEXT NOT NULL,
      seq         INTEGER NOT NULL,
      event       TEXT NOT NULL,
      payload     TEXT NOT NULL,
      received_at INTEGER NOT NULL,
      PRIMARY KEY (session_id, seq)
    );
  `);
  return db;
}

function makeStore(db) {
  const insertEvent = db.prepare(
    `INSERT OR IGNORE INTO events (session_id, seq, event, payload, received_at) VALUES (?, ?, ?, ?, ?)`
  );
  // Newest seq wins the snapshot. The lead survives any later snapshot that lacks
  // one, so a stale replay can never erase contact details.
  const upsert = db.prepare(
    `INSERT INTO responses (session_id, seq, started_at, updated_at, snapshot, lead, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       seq        = CASE WHEN excluded.seq > responses.seq THEN excluded.seq ELSE responses.seq END,
       updated_at = CASE WHEN excluded.seq > responses.seq THEN excluded.updated_at ELSE responses.updated_at END,
       snapshot   = CASE WHEN excluded.seq > responses.seq THEN excluded.snapshot ELSE responses.snapshot END,
       lead       = COALESCE(excluded.lead, responses.lead),
       received_at = excluded.received_at`
  );
  const pendingStmt = db.prepare(
    `SELECT session_id, seq, snapshot, lead FROM responses WHERE synced_seq < seq ORDER BY received_at LIMIT ?`
  );
  const markStmt = db.prepare(`UPDATE responses SET synced_seq = ? WHERE session_id = ? AND synced_seq < ?`);
  const getStmt = db.prepare(`SELECT session_id, seq, snapshot, lead FROM responses WHERE session_id = ?`);
  const countsStmt = db.prepare(
    `SELECT COUNT(*) AS responses,
            SUM(lead IS NOT NULL) AS leads,
            SUM(synced_seq < seq) AS unsynced
     FROM responses`
  );

  function rowToResponse(row) {
    const r = JSON.parse(row.snapshot);
    r.seq = row.seq;
    r.lead = row.lead ? JSON.parse(row.lead) : null;
    return r;
  }

  return {
    /** Stores one validated response. Returns true when it was new. */
    ingest(r) {
      const now = Date.now();
      const { lead, ...snap } = r;
      const fresh = insertEvent.run(r.sessionId, r.seq, r.event, JSON.stringify(r), now).changes > 0;
      upsert.run(r.sessionId, r.seq, r.startedAt, r.at, JSON.stringify(snap),
        lead ? JSON.stringify(lead) : null, now);
      return fresh;
    },
    get(sessionId) {
      const row = getStmt.get(sessionId);
      return row ? rowToResponse(row) : null;
    },
    pending(limit) {
      return pendingStmt.all(limit).map(rowToResponse);
    },
    markSynced(sessionId, seq) {
      markStmt.run(seq, sessionId, seq);
    },
    counts() {
      const c = countsStmt.get();
      return { responses: c.responses, leads: c.leads || 0, unsynced: c.unsynced || 0 };
    },
  };
}

module.exports = { open, makeStore };
