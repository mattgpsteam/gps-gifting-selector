'use strict';

const { STEP_IDS, RESULTS, TRADESHOW_ANSWERS, EVENTS } = require('./fields');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EVENT_TYPES = new Set(['answer', 'lead']);
const EVENT_SET = new Set(EVENTS);

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isoOrNull = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/**
 * Checks one posted response and returns `{ value }` (cleaned) or `{ error }`.
 * The endpoint is public, so everything is length-capped and anything outside
 * the known question set is refused rather than stored.
 */
function validateResponse(r) {
  if (!r || typeof r !== 'object') return { error: 'not an object' };
  if (typeof r.sessionId !== 'string' || !UUID.test(r.sessionId)) return { error: 'sessionId must be a uuid' };
  if (!Number.isInteger(r.seq) || r.seq < 1 || r.seq > 10000) return { error: 'seq out of range' };
  if (!EVENT_TYPES.has(r.event)) return { error: 'unknown event' };

  const at = isoOrNull(r.at);
  const startedAt = isoOrNull(r.startedAt);
  if (!at || !startedAt) return { error: 'at/startedAt must be ISO dates' };

  const order = Array.isArray(r.order) ? r.order.filter((id) => STEP_IDS.has(id)).slice(0, 20) : [];
  const answers = {};
  for (const [id, v] of Object.entries(r.answers && typeof r.answers === 'object' ? r.answers : {})) {
    if (!STEP_IDS.has(id)) return { error: `unknown question ${id}` };
    answers[id] = id === 'PROGRAMS'
      ? (Array.isArray(v) ? v.map((x) => str(x, 120)).filter(Boolean).slice(0, 10) : [])
      : str(v, 200);
  }

  if (r.result != null && !RESULTS.includes(r.result)) return { error: 'unknown result' };
  const score = Number.isInteger(r.score) && Math.abs(r.score) < 100 ? r.score : null;

  const value = {
    sessionId: r.sessionId.toLowerCase(), seq: r.seq, event: r.event, at, startedAt,
    order, answers, result: r.result || null, score,
    source: str(r.source, 200), referrer: str(r.referrer, 500), userAgent: str(r.userAgent, 400),
  };

  if (r.event === 'lead') {
    const l = r.lead && typeof r.lead === 'object' ? r.lead : null;
    if (!l) return { error: 'lead event without lead' };
    const lead = {
      name: str(l.name, 120), email: str(l.email, 200), phone: str(l.phone, 40), casino: str(l.casino, 160),
      tradeshows: str(l.tradeshows, 40),
      events: Array.isArray(l.events) ? [...new Set(l.events.filter((e) => EVENT_SET.has(e)))] : [],
      otherEvent: str(l.otherEvent, 120),
    };
    if (!lead.name || !lead.casino) return { error: 'lead needs name and casino' };
    if (!EMAIL.test(lead.email)) return { error: 'lead email invalid' };
    if (!TRADESHOW_ANSWERS.includes(lead.tradeshows)) return { error: 'lead tradeshows answer invalid' };
    if (lead.tradeshows === 'No') { lead.events = []; lead.otherEvent = ''; }
    value.lead = lead;
  }
  return { value };
}

module.exports = { validateResponse };
