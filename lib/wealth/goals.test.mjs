import test from 'node:test'
import assert from 'node:assert/strict'
import { goalProgress, overAllocated, emergencyTarget } from './goals.js'

const data = { bankAccounts: [{ id: 'b', nickname: 'Savings', currentBalance: 200000 }], funds: [{ id: 'f', name: 'Liquid fund', currentValue: 100000 }], assets: [{ id: 'a', name: 'FD', value: 500000 }] }
const today = new Date(2026, 0, 1)

test('progress counts only the linked share of each source', () => {
  const g = { target: 600000, targetDate: '2027-01-01', links: [{ type: 'bank', id: 'b', pct: 100 }, { type: 'asset', id: 'a', pct: 50 }] }
  const p = goalProgress(g, data, today)
  assert.equal(p.current, 450000)
  assert.equal(p.remaining, 150000)
  assert.equal(p.pct, 75)
  assert.equal(p.monthsLeft, 12)
  assert.equal(p.monthlyNeeded, 12500)
  assert.equal(p.achieved, false)
})

test('achieved goals and missing sources', () => {
  assert.equal(goalProgress({ target: 100, links: [{ type: 'fund', id: 'f', pct: 100 }] }, data, today).achieved, true)
  assert.equal(goalProgress({ target: 100, links: [{ type: 'bank', id: 'gone', pct: 100 }] }, data, today).current, 0)
})

test('over-allocation across goals is detected', () => {
  const goals = [{ links: [{ type: 'asset', id: 'a', pct: 70 }] }, { links: [{ type: 'asset', id: 'a', pct: 50 }, { type: 'bank', id: 'b', pct: 100 }] }]
  assert.deepEqual(overAllocated(goals), [{ key: 'asset:a', pct: 120 }])
  assert.equal(emergencyTarget({ budget: { total: 50000 } }), 300000)
})
