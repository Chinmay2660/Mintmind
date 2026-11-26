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

import { fundsToRefresh } from './freshness.js'

test('only linked funds not looked up today are refreshed', () => {
  const funds = [
    { id: 'a', schemeCode: '1', navFetchedAt: '2026-11-25T09:00:00Z' },
    { id: 'b', schemeCode: '2', navFetchedAt: '2026-11-26T01:00:00Z' },
    { id: 'c', schemeCode: '3' },
    { id: 'd' }, // not linked to a scheme: nothing to look up
  ]
  assert.deepEqual(fundsToRefresh(funds, '2026-11-26').map((f) => f.id), ['a', 'c'])
  assert.deepEqual(fundsToRefresh([], '2026-11-26'), [])
})
