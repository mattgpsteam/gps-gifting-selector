'use strict';

/**
 * The one definition of what a Responses row looks like in Airtable.
 *
 * Both the live mirror (toFields) and the table-setup script (SCHEMA) read this
 * file, so the Airtable columns cannot drift from what the mirror writes.
 */

// Selector step id -> Airtable column. Order here is column order in the table.
const QUESTIONS = [
  ['GOAL', 'Goal'],
  ['BUDGET', 'Budget'],
  ['VIPUSE', 'VIP Gifting'],
  ['VIPBUDGET', 'VIP Budget'],
  ['TIERS', 'Tier Differentiation'],
  ['DEMO', 'Demographics'],
  ['REDUCE', 'Reduce Lever'],
  ['RAINCHECK', 'Rain Checks'],
  ['ADDPROG', 'Add Programs'],
  ['PROGRAMS', 'Program Ideas'],
  ['BEHAVIOR', 'Behavior Target'],
];
const STEP_IDS = new Set(QUESTIONS.map(([id]) => id));

const RESULTS = ['Traditional Gifting', 'Hybrid Gifting Program', 'Full Digital Dropship'];
const TRADESHOW_ANSWERS = ['Yes', 'No', 'Only Executives'];
const EVENTS = ['IGA', 'G2E', 'Raving/CMTC', 'Casino Connect', 'OIGA', 'WIGA', 'ICE',
  'Native Nations (AI Within Tribal Gaming)', 'Other'];
// Q8' labels, exactly as the page sends them.
const PROGRAM_IDEAS = ['Adding the ability to bank points', 'Providing custom experiences for VIPs',
  'Allowing players to continuously spend points', 'Increasing gifting budget'];
const STATUSES = ['In progress', 'Reached form', 'Lead submitted', 'Sales demo'];

const dateTime = { dateFormat: { name: 'us' }, timeFormat: { name: '12hour' }, timeZone: 'America/Los_Angeles' };
const choices = (names) => ({ choices: names.map((name) => ({ name })) });

const SCHEMA = [
  { name: 'Session ID', type: 'singleLineText' }, // primary field + upsert merge key
  { name: 'Started', type: 'dateTime', options: dateTime },
  { name: 'Last Activity', type: 'dateTime', options: dateTime },
  { name: 'Status', type: 'singleSelect', options: choices(STATUSES) },
  { name: 'Recommendation', type: 'singleSelect', options: choices(RESULTS) },
  { name: 'Score', type: 'number', options: { precision: 0 } },
  { name: 'Questions Answered', type: 'number', options: { precision: 0 } },
  { name: 'Name', type: 'singleLineText' },
  { name: 'Email', type: 'email' },
  { name: 'Phone', type: 'phoneNumber' },
  { name: 'Casino', type: 'singleLineText' },
  { name: 'Attends Tradeshows', type: 'singleSelect', options: choices(TRADESHOW_ANSWERS) },
  { name: 'Tradeshows Attended', type: 'multipleSelects', options: choices(EVENTS) },
  { name: 'Other Tradeshow', type: 'singleLineText' },
  ...QUESTIONS.map(([id, name]) => (id === 'PROGRAMS'
    ? { name, type: 'multipleSelects', options: choices(PROGRAM_IDEAS) }
    : { name, type: 'singleLineText' })),
  { name: 'Source', type: 'singleLineText' },
  { name: 'Referrer', type: 'singleLineText' },
  { name: 'User Agent', type: 'singleLineText' },
];

function statusOf(row) {
  if (row.lead) return 'Lead submitted';
  // A rep's /sales run never shows the form, so "Reached form" would read as a lost lead.
  if (row.result && (row.source || '').endsWith(' (sales)')) return 'Sales demo';
  if (row.result) return 'Reached form';
  return 'In progress';
}

/** A stored response (see db.js rowToResponse) -> Airtable fields. */
function toFields(r) {
  const lead = r.lead || {};
  const f = {
    'Session ID': r.sessionId,
    'Started': r.startedAt,
    'Last Activity': r.at,
    'Status': statusOf(r),
    'Recommendation': r.result || null,
    'Score': r.score ?? null,
    'Questions Answered': (r.order || []).length,
    'Name': lead.name || '',
    'Email': lead.email || null, // Airtable rejects '' in an email field
    'Phone': lead.phone || '',
    'Casino': lead.casino || '',
    'Attends Tradeshows': lead.tradeshows || null,
    'Tradeshows Attended': lead.events || [],
    'Other Tradeshow': lead.otherEvent || '',
    'Source': r.source || '',
    'Referrer': r.referrer || '',
    'User Agent': r.userAgent || '',
  };
  // Every question column is written every time, blank when unanswered, so an
  // answer the visitor backed out of is cleared rather than left stale.
  for (const [id, name] of QUESTIONS) {
    const v = (r.answers || {})[id];
    f[name] = id === 'PROGRAMS' ? (Array.isArray(v) ? v : []) : (v || '');
  }
  return f;
}

module.exports = { QUESTIONS, STEP_IDS, RESULTS, TRADESHOW_ANSWERS, EVENTS, SCHEMA, toFields, statusOf };
