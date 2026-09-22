'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

process.env.ALLOWED_ORIGINS = 'https://gifting-selector.gpspromotions.com,null';
const { open, makeStore } = require('../src/db');
const { makeApp } = require('../src/server');
const { makeMirror } = require('../src/airtable');
const { validateResponse } = require('../src/validate');
const { toFields, SCHEMA } = require('../src/fields');

const SID = '8f14e45f-ea0b-4c73-9d1a-2a0d9b21c8f1';
const T0 = '2026-09-22T20:00:00.000Z';

function freshStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'selector-'));
  return makeStore(open(path.join(dir, 'r.sqlite')));
}

function answer(seq, answers, extra = {}) {
  return { sessionId: SID, seq, event: 'answer', startedAt: T0, at: T0, order: Object.keys(answers), answers, ...extra };
}

const LEAD = { name: 'Pat Doe', email: 'pat@casino.com', phone: '', casino: 'Riverwind', tradeshows: 'Yes', events: ['G2E', 'Other'], otherEvent: 'NIGA' };

test('validate: accepts a real answer and a real lead', () => {
  assert.ok(validateResponse(answer(1, { GOAL: 'Reduce budgets' })).value);
  const v = validateResponse({ ...answer(9, { GOAL: 'x' }, { result: 'Hybrid Gifting Program', score: 2 }), event: 'lead', lead: LEAD });
  assert.deepEqual(v.value.lead.events, ['G2E', 'Other']);
});

test('validate: refuses junk', () => {
  assert.match(validateResponse({ ...answer(1, {}), sessionId: 'nope' }).error, /uuid/);
  assert.match(validateResponse(answer(1, { HACK: 'x' })).error, /unknown question/);
  assert.match(validateResponse(answer(1, {}, { result: 'Free Money' })).error, /unknown result/);
  assert.match(validateResponse({ ...answer(2, {}), event: 'lead', lead: { ...LEAD, email: 'bad' } }).error, /email/);
  // Unknown tradeshows are dropped, not stored.
  const v = validateResponse({ ...answer(2, {}), event: 'lead', lead: { ...LEAD, events: ['G2E', '<script>'] } });
  assert.deepEqual(v.value.lead.events, ['G2E']);
});

test('store: newest seq wins, stale replay ignored, lead is sticky', () => {
  const s = freshStore();
  s.ingest(validateResponse(answer(2, { GOAL: 'Reduce budgets', BUDGET: '$40+' })).value);
  s.ingest(validateResponse(answer(1, { GOAL: 'Reduce budgets' })).value); // late replay
  assert.equal(s.get(SID).answers.BUDGET, '$40+');

  s.ingest(validateResponse({ ...answer(3, { GOAL: 'Reduce budgets' }), event: 'lead', lead: LEAD }).value);
  s.ingest(validateResponse(answer(4, { GOAL: 'Drive incremental visits' })).value);
  const r = s.get(SID);
  assert.equal(r.answers.GOAL, 'Drive incremental visits');
  assert.equal(r.lead.email, 'pat@casino.com');
  assert.equal(s.ingest(validateResponse(answer(4, {})).value), false, 'duplicate (session, seq) is not new');
});

test('fields: every mapped column exists in the schema, and unanswered questions are blanked', () => {
  const names = new Set(SCHEMA.map((f) => f.name));
  const f = toFields({ sessionId: SID, seq: 1, startedAt: T0, at: T0, order: ['GOAL'], answers: { GOAL: 'x' }, lead: null });
  for (const k of Object.keys(f)) assert.ok(names.has(k), `schema missing ${k}`);
  assert.equal(f['Budget'], '');
  assert.equal(f['Status'], 'In progress');
  assert.equal(f['Email'], null);
});

function serve(store) {
  const handle = makeApp(store);
  const server = http.createServer((q, s) => handle(q, s));
  return new Promise((r) => server.listen(0, () => r(server)));
}

async function post(server, body, origin = 'https://gifting-selector.gpspromotions.com') {
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/responses`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body),
  });
  return { status: res.status, cors: res.headers.get('access-control-allow-origin'), body: await res.json() };
}

test('http: stores a batch, counts rejects, CORS only for allowed origins', async () => {
  const store = freshStore();
  const server = await serve(store);
  try {
    const r = await post(server, { responses: [answer(1, { GOAL: 'Reduce budgets' }), { junk: true }] });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true, stored: 1, rejected: 1 });
    assert.equal(r.cors, 'https://gifting-selector.gpspromotions.com');

    const evil = await post(server, { responses: [answer(2, {})] }, 'https://evil.example');
    assert.equal(evil.cors, null);

    const bad = await post(server, { responses: [] });
    assert.equal(bad.status, 400);

    const pre = await fetch(`http://127.0.0.1:${server.address().port}/api/responses`, { method: 'OPTIONS', headers: { origin: 'null' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), 'null');
  } finally {
    server.close();
  }
});

function fakeAirtable(handler) {
  const calls = [];
  const f = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const { status = 200, text = '{}' } = handler(body, calls.length) || {};
    return { ok: status < 300, status, text: async () => text, headers: { get: () => null } };
  };
  return { f, calls };
}

const quiet = { log() {}, error() {} };

test('mirror: batches, marks synced, and resyncs only when a row changes', async () => {
  const store = freshStore();
  store.ingest(validateResponse(answer(1, { GOAL: 'Reduce budgets' })).value);
  const at = fakeAirtable(() => ({}));
  const m = makeMirror(store, { pat: 'p', baseId: 'appX', table: 'Responses', fetch: at.f }, quiet);
  assert.equal(await m.tick(), 1);
  assert.deepEqual(at.calls[0].performUpsert, { fieldsToMergeOn: ['Session ID'] });
  assert.equal(await m.tick(), 0);
  store.ingest(validateResponse(answer(2, { GOAL: 'Reduce budgets', BUDGET: '$40+' })).value);
  assert.equal(await m.tick(), 1);
  assert.equal(store.counts().unsynced, 0);
});

test('mirror: a bad value skips one row; a schema problem halts and keeps everything', async () => {
  const store = freshStore();
  const other = '11111111-2222-4333-8444-555555555555';
  store.ingest(validateResponse(answer(1, { GOAL: 'a' })).value);
  store.ingest(validateResponse({ ...answer(1, { GOAL: 'b' }), sessionId: other }).value);

  const at = fakeAirtable((body) => (body.records.length > 1 || body.records[0].fields['Session ID'] === other
    ? { status: 422, text: '{"error":{"type":"INVALID_VALUE_FOR_COLUMN"}}' } : {}));
  const m = makeMirror(store, { pat: 'p', baseId: 'appX', table: 'Responses', fetch: at.f }, quiet);
  assert.equal(await m.tick(), 2);
  assert.equal(store.counts().unsynced, 0);

  const s2 = freshStore();
  s2.ingest(validateResponse(answer(1, { GOAL: 'a' })).value);
  const broken = fakeAirtable(() => ({ status: 422, text: '{"error":{"type":"UNKNOWN_FIELD_NAME"}}' }));
  const m2 = makeMirror(s2, { pat: 'p', baseId: 'appX', table: 'Responses', fetch: broken.f }, quiet);
  await assert.rejects(m2.tick(), /UNKNOWN_FIELD_NAME/);
  assert.equal(s2.counts().unsynced, 1);
});
