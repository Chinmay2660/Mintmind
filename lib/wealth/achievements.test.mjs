import test from 'node:test'
import assert from 'node:assert/strict'
import { achievements } from './achievements.js'

const today = new Date(2026, 10, 19) // 19 November 2026
const by = (r, id) => r.find((x) => x.id === id)
const ex = (date, amount) => ({ date, amount })
const inc = (date, amount) => ({ date, type: 'income', amount })

test('under budget counts whole months in a row ending last month, not this month', () => {
  const budgets = ['2026-08', '2026-09', '2026-10', '2026-11'].map((id) => ({ id, total: 50000 }))
  const expenses = [ex('2026-08-05', 60000), ex('2026-09-05', 40000), ex('2026-10-05', 45000), ex('2026-11-05', 90000)]
  const a = by(achievements({ expenses, budgets, today }), 'under-budget')
  assert.equal(a.current, 2) // September and October; August broke it, November is not finished
  assert.deepEqual(a.earned, [1])
  assert.equal(a.next.tier, 3)
  assert.equal(a.next.pct, 67)
})
test('a month with no budget set breaks the streak', () => {
  const budgets = [{ id: '2026-10', total: 50000 }]
  assert.equal(by(achievements({ expenses: [ex('2026-10-05', 10)], budgets, today }), 'under-budget').current, 1)
  assert.equal(by(achievements({ expenses: [ex('2026-09-05', 10)], budgets: [{ id: '2026-09', total: 5 }], today }), 'under-budget').current, 0)
})
test('saving a fifth of income, month after month', () => {
  const bankTxns = [inc('2026-10-01', 100000), inc('2026-09-01', 100000), inc('2026-08-01', 100000)]
  const expenses = [ex('2026-10-10', 70000), ex('2026-09-10', 79000), ex('2026-08-10', 90000)]
  assert.equal(by(achievements({ expenses, bankTxns, today }), 'saver').current, 2)
})
test('tracking counts months with a snapshot including this one, and rising counts higher months', () => {
  const snapshots = [{ id: '2026-11', netWorth: 130 }, { id: '2026-10', netWorth: 120 }, { id: '2026-09', netWorth: 110 }, { id: '2026-08', netWorth: 115 }]
  const r = achievements({ snapshots, today })
  assert.equal(by(r, 'tracking').current, 4)
  assert.deepEqual(by(r, 'tracking').earned, [3])
  assert.equal(by(r, 'rising').current, 2)
  assert.deepEqual(by(r, 'rising').earned, [2])
})
test('goals and emergency cover', () => {
  const r = achievements({ goalsAchieved: 3, liquid: 300000, expenses: [ex('2026-10-05', 60000), ex('2026-09-05', 60000), ex('2026-08-05', 60000)], today })
  assert.deepEqual(by(r, 'goals').earned, [1, 3])
  assert.equal(by(r, 'cover').current, 5)
  assert.deepEqual(by(r, 'cover').earned, [1, 3])
  assert.equal(by(r, 'cover').next.tier, 6)
})
test('nothing earned with no data, and the top tier leaves no next', () => {
  assert.ok(achievements({ today }).every((x) => x.earned.length === 0))
  assert.equal(by(achievements({ goalsAchieved: 9, today }), 'goals').next, null)
})
