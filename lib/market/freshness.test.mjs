import test from 'node:test'
import assert from 'node:assert/strict'
import { businessDaysBetween, navFreshness, agoLabel } from './freshness.js'

test('business days skip weekends', () => {
  assert.equal(businessDaysBetween('2026-11-20', '2026-11-23'), 1) // Fri to Mon
  assert.equal(businessDaysBetween('2026-11-23', '2026-11-23'), 0)
  assert.equal(businessDaysBetween('2026-11-24', '2026-11-20'), 0)
})

test('a Friday NAV is current on Monday; a week-old NAV is stale; no date is unknown, not stale', () => {
  assert.equal(navFreshness('2026-11-20', '2026-11-23').stale, false)
  assert.equal(navFreshness('2026-11-16', '2026-11-25').stale, true)
  assert.deepEqual(navFreshness('', '2026-11-25'), { days: null, stale: false, unknown: true })
})

test('refresh time wording', () => {
  const now = Date.parse('2026-11-25T12:00:00Z')
  assert.equal(agoLabel('2026-11-25T11:59:40Z', now), 'just now')
  assert.equal(agoLabel('2026-11-25T11:30:00Z', now), '30 min ago')
  assert.equal(agoLabel('2026-11-25T09:00:00Z', now), '3 h ago')
  assert.equal(agoLabel('nope', now), '')
})
