'use strict';

const http = require('node:http');
const { open, makeStore } = require('./db');
const { makeMirror } = require('./airtable');
const { validateResponse } = require('./validate');

const PORT = Number(process.env.PORT || 8080);
const DB_FILE = process.env.DB_FILE || '/data/responses.sqlite';
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || 'https://gifting-selector.gpspromotions.com,null')
  .split(',').map((s) => s.trim()).filter(Boolean));

const MAX_BODY_BYTES = 128 * 1024;
const MAX_PER_POST = 50;
// The endpoint is public (the page is), so it is rate limited per client IP.
// A whole show floor behind one casino NAT is still a few posts a minute.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 240;

function makeApp(store) {
  const hits = new Map();

  function limited(ip) {
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || now - h.start > RATE_WINDOW_MS) {
      hits.set(ip, { start: now, n: 1 });
      if (hits.size > 10000) for (const [k, v] of hits) if (now - v.start > RATE_WINDOW_MS) hits.delete(k);
      return false;
    }
    h.n += 1;
    return h.n > RATE_MAX;
  }

  function cors(req, res) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
      res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
      res.setHeader('access-control-allow-headers', 'content-type');
      res.setHeader('access-control-max-age', '86400');
    }
  }

  function json(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(payload),
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    });
    res.end(payload);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY_BYTES) {
          reject(Object.assign(new Error('body too large'), { status: 413 }));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    cors(req, res);

    if (req.method === 'GET' && url.pathname === '/healthz') {
      return json(res, 200, { ok: true, ...store.counts() });
    }

    if (url.pathname === '/api/responses') {
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' });

      // Caddy overwrites X-Forwarded-For from untrusted clients, so this is the real client.
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (limited(ip)) return json(res, 429, { ok: false, error: 'slow down' });

      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch (e) {
        return json(res, e.status || 400, { ok: false, error: e.status ? e.message : 'body is not valid JSON' });
      }
      const list = body && Array.isArray(body.responses) ? body.responses : null;
      if (!list || !list.length || list.length > MAX_PER_POST) {
        return json(res, 400, { ok: false, error: `responses must be an array of 1-${MAX_PER_POST}` });
      }

      // Items are judged one by one. The page clears the whole batch on ok, which
      // is right: an item rejected here would be rejected on every retry too.
      let stored = 0;
      const rejected = [];
      for (const item of list) {
        const v = validateResponse(item);
        if (v.error) { rejected.push({ sessionId: item && item.sessionId, seq: item && item.seq, error: v.error }); continue; }
        if (store.ingest(v.value)) stored += 1;
      }
      if (rejected.length) console.warn('rejected', JSON.stringify(rejected).slice(0, 500));
      return json(res, 200, { ok: true, stored, rejected: rejected.length });
    }

    json(res, 404, { ok: false, error: 'not found' });
  };
}

if (require.main === module) {
  const store = makeStore(open(DB_FILE));
  const mirror = makeMirror(store, {
    pat: process.env.AIRTABLE_PAT || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
    table: process.env.AIRTABLE_TABLE || 'Responses',
  });
  const handle = makeApp(store);
  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) { res.writeHead(500); res.end(); }
    });
  });
  server.listen(PORT, () => console.log(`selector-log on :${PORT}, db ${DB_FILE}, origins ${[...ALLOWED_ORIGINS].join(' ')}`));
  mirror.run();
  const stop = () => { mirror.stop(); server.close(() => process.exit(0)); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

module.exports = { makeApp };
