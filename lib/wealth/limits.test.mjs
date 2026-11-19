import test from 'node:test'
import assert from 'node:assert/strict'
import { fyStart, fyLabel, contributedThisYear, limitStatus } from './limits.js'

test('the financial year runs April to March', () => {
  assert.equal(fyStart('2026-04-01'), 2026)
  assert.equal(fyStart('2026-11-05'), 2026)
  assert.equal(fyStart('2027-03-31'), 2026)
  assert.equal(fyStart('2026-03-31'), 2025)
  assert.equal(fyLabel(2026), '2026-27')
  assert.equal(fyLabel(1999), '1999-00')
})
test('only contributions in this financial year count', () => {
  const ppf = { category: 'ppf', contributions: [{ date: '2026-04-10', amount: 50000 }, { date: '2026-03-30', amount: 90000 }, { date: '2026-12-01', amount: 25000 }] }
  assert.equal(contributedThisYear(ppf, new Date(2026, 10, 20)), 75000)
  assert.equal(contributedThisYear({}, new Date(2026, 10, 20)), 0)
})
test('status shows what is left, what is over, and sums every account of the kind', () => {
  const assets = [{ category: 'ppf', contributions: [{ date: '2026-05-01', amount: 100000 }] }, { category: 'ppf', contributions: [{ date: '2026-06-01', amount: 60000 }] }, { category: 'nps', contributions: [{ date: '2026-06-01', amount: 20000 }] }]
  const s = limitStatus(assets, 'ppf', new Date(2026, 10, 20))
  assert.equal(s.used, 160000); assert.equal(s.left, 0); assert.equal(s.over, 10000); assert.equal(s.pct, 100)
  const n = limitStatus(assets, 'nps', new Date(2026, 10, 20))
  assert.equal(n.left, 30000); assert.equal(n.pct, 40)
})
