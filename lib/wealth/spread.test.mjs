import test from 'node:test'
import assert from 'node:assert/strict'
import { spreadMonths, monthShares, addMonths } from './spread.js'
import { categoryTotals } from './selectors.js'

test('6000 over last month and this month is 3000 each', () => {
  assert.deepEqual(spreadMonths(6000, '2026-10', 2), [{ ym: '2026-10', amount: 3000 }, { ym: '2026-11', amount: 3000 }])
})
test('odd paisa goes to the last month and parts add up', () => {
  const p = spreadMonths(100, '2026-01', 3)
  assert.equal(Math.round(p.reduce((s, x) => s + x.amount, 0) * 100) / 100, 100)
  assert.equal(p[2].amount, 33.34)
})
test('months roll over the year end', () => { assert.equal(addMonths('2026-11', 2), '2027-01') })
test('a plain expense counts in the month of its date', () => {
  assert.deepEqual(monthShares({ date: '2026-11-25', amount: 500 }), [{ ym: '2026-11', share: 1 }])
})
test('category totals use the spread, not the payment date', () => {
  const e = { date: '2026-11-25', amount: 6000, category: 'Bills', budgetMonths: spreadMonths(6000, '2026-10', 2) }
  assert.equal(categoryTotals([e], '2026-10').Bills, 3000)
  assert.equal(categoryTotals([e], '2026-11').Bills, 3000)
  assert.equal(categoryTotals([e], '2026-12').Bills, undefined)
})
test('a spread that no longer matches the amount is ignored', () => {
  const e = { date: '2026-11-25', amount: 7000, category: 'Bills', budgetMonths: spreadMonths(6000, '2026-10', 2) }
  assert.equal(categoryTotals([e], '2026-11').Bills, 7000)
  assert.equal(categoryTotals([e], '2026-10').Bills, undefined)
})
test('a split expense that is also spread keeps its category parts', () => {
  const e = { date: '2026-11-25', amount: 6000, category: 'Bills', splits: [{ category: 'Bills', amount: 4000 }, { category: 'Other', amount: 2000 }], budgetMonths: spreadMonths(6000, '2026-10', 2) }
  assert.equal(categoryTotals([e], '2026-10').Bills, 2000)
  assert.equal(categoryTotals([e], '2026-11').Other, 1000)
})

import { dayChange } from './calc.js'
test("today's change is against what it was when the app first opened today", () => {
  const daily = [{ date: '2026-10-25', open: 900, netWorth: 900 }, { date: '2026-11-25', open: 1000, netWorth: 1040 }]
  const g = dayChange(daily, 1050, new Date(2026, 10, 25))
  assert.equal(g.base, 1000)
  assert.equal(g.diff, 50)
  assert.equal(g.pct, 5)
  assert.equal(g.baseDate, '2026-11-25')
})
test('a gap since the last visit does not turn into a month-long "today"', () => {
  assert.equal(dayChange([{ date: '2026-10-25', open: 1, netWorth: 1 }], 500, new Date(2026, 10, 25)).diff, 0)
})
test('nothing recorded yet means no change, not an error', () => {
  assert.equal(dayChange([], 1000, new Date(2026, 10, 25)).diff, 0)
  assert.equal(dayChange(undefined, 1000, new Date(2026, 10, 25)).pct, 0)
})
