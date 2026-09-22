'use strict';

/**
 * Creates (or tops up) the Responses table in the selector's Airtable base,
 * from the same field list the mirror writes (src/fields.js).
 *
 *   AIRTABLE_PAT=... AIRTABLE_BASE_ID=app... node scripts/airtable-setup-table.js
 *
 * Idempotent: creates the table if missing, adds any missing fields, and never
 * deletes or retypes anything. Needs schema.bases:read + schema.bases:write,
 * which the runtime token should NOT keep.
 */
const { SCHEMA } = require('../src/fields');

const pat = process.env.AIRTABLE_PAT;
const baseId = process.env.AIRTABLE_BASE_ID;
const table = process.env.AIRTABLE_TABLE || 'Responses';
if (!pat || !baseId) {
  console.error('set AIRTABLE_PAT and AIRTABLE_BASE_ID');
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}${path}`, {
    method,
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

(async () => {
  const { tables } = await api('GET', '/tables');
  const existing = tables.find((t) => t.name === table);
  if (!existing) {
    const t = await api('POST', '/tables', {
      name: table,
      description: 'One row per Gifting Program Selector visitor. Written by selector-log; edit views freely, not field names.',
      fields: SCHEMA,
    });
    console.log(`created table ${table} (${t.id}) with ${SCHEMA.length} fields`);
    return;
  }
  const have = new Set(existing.fields.map((f) => f.name));
  const missing = SCHEMA.filter((f) => !have.has(f.name));
  for (const f of missing) {
    await api('POST', `/tables/${existing.id}/fields`, f);
    console.log(`added field ${f.name}`);
  }
  console.log(missing.length ? `done, ${missing.length} field(s) added` : `table ${table} already has every field`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
