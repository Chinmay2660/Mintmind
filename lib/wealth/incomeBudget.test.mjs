import test from 'node:test'
import assert from 'node:assert/strict'
import { planFor, incomeProgress } from './incomeBudget.js'

test('a month without its own plan uses the latest earlier one', () => {
  const plans = { '2026-09': { total: 100 }, '2026-10': { total: 120 } }
  assert.equal(planFor(plans, '2026-11').total, 120)
  assert.equal(planFor(plans, '2026-10').total, 120)
  assert.equal(planFor(plans, '2026-08'), null)
})
test('received comes from that month\'s income, by category', () => {
  const plan = { total: 1000, categories: { Salary: 800, Rent: 200 } }
  const txns = [{ type: 'income', date: '2026-11-01', amount: 800, category: 'Salary' }, { type: 'income', date: '2026-11-10', amount: 50, category: 'Gift' }, { type: 'income', date: '2026-10-01', amount: 999, category: 'Salary' }, { type: 'expense', date: '2026-11-02', amount: 5 }]
  const p = incomeProgress({ plan, bankTxns: txns, ym: '2026-11' })
  assert.equal(p.received, 850)
  assert.equal(p.pct, 85)
  assert.equal(p.rows.find((r) => r.category === 'Salary').pct, 100)
  assert.equal(p.rows.find((r) => r.category === 'Rent').received, 0)
  assert.equal(p.rows.find((r) => r.category === 'Gift').pct, null) // received with no plan
})
test('no plan means nothing expected', () => {
  const p = incomeProgress({ plan: null, bankTxns: [], ym: '2026-11' })
  assert.equal(p.expected, 0)
  assert.equal(p.pct, null)
})
