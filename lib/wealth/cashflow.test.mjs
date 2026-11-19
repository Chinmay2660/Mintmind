import test from 'node:test'
import assert from 'node:assert/strict'
import { cashFlow } from './cashflow.js'

const t = (date, kind, amount, category) => ({ date, kind, amount, category })
const list = [t('2026-06-01', 'income', 100000, 'Salary'), t('2026-06-10', 'expense', 40000, 'Rent'), t('2026-06-11', 'transfer', 5000, 'Transfer'), t('2026-05-02', 'income', 90000, 'Salary'), t('2026-05-20', 'expense', 95000, 'Travel'), t('2025-01-01', 'expense', 1, 'Old')]

test('six months ending June, oldest first, transfers and old entries left out', () => {
  const r = cashFlow(list, '2026-06')
  assert.deepEqual(r.series.map((x) => x.ym), ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'])
  assert.equal(r.totalIn, 190000)
  assert.equal(r.totalOut, 135000)
  assert.equal(r.net, 55000)
})
test('net and savings rate per month, negative when spending is higher', () => {
  const r = cashFlow(list, '2026-06')
  const [may, jun] = r.series.slice(-2)
  assert.equal(jun.net, 60000)
  assert.equal(jun.savingsRate, 60)
  assert.equal(may.net, -5000)
  assert.equal(may.savingsRate, -6)
  assert.equal(r.series[0].savingsRate, null)
})
test('sources and uses ranked with shares', () => {
  const r = cashFlow(list, '2026-06')
  assert.equal(r.sources[0].category, 'Salary')
  assert.equal(r.uses[0].category, 'Travel')
  assert.equal(r.uses[0].pct, 70.4)
  assert.equal(r.avgNet, 27500)
})
