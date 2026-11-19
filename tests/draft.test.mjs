import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entriesToDraft, parseDraft, DRAFT_TTL_MS } from '../lib/draft.js';

test('keeps filled answers, drops empties and the honeypot', () => {
  const d = entriesToDraft([['work_type', 'care'], ['company_name', ' Bupa '], ['comment', ''], ['website', 'spam']], 1000);
  assert.deepEqual(d, { savedAt: 1000, fields: { work_type: 'care', company_name: 'Bupa' } });
});

test('round trip through JSON', () => {
  const d = entriesToDraft([['hourly_rate', '12.50'], ['shift', 'night']], 5000);
  assert.deepEqual(parseDraft(JSON.stringify(d), 6000), d);
});

test('expires after 2 hours and rejects junk', () => {
  const d = JSON.stringify(entriesToDraft([['region', 'london']], 0));
  assert.equal(parseDraft(d, DRAFT_TTL_MS + 1), null);
  assert.equal(parseDraft('not json'), null);
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft(JSON.stringify({ savedAt: 1, fields: {} }), 2), null);
  assert.equal(parseDraft(JSON.stringify({ savedAt: 'x', fields: { a: 'b' } })), null);
});

test('long values are capped', () => {
  const d = entriesToDraft([['comment', 'x'.repeat(1000)]], 1);
  assert.equal(d.fields.comment.length, 400);
});

test("ignores React's hidden server-action fields", () => {
  const d = entriesToDraft([['$ACTION_KEY', 'abc'], ['$ACTION_1:0', '{}'], ['work_type', 'care']], 1);
  assert.deepEqual(d.fields, { work_type: 'care' });
  assert.deepEqual(parseDraft(JSON.stringify({ savedAt: 1, fields: { $ACTION_KEY: 'x', region: 'london' } }), 2).fields, { region: 'london' });
});
