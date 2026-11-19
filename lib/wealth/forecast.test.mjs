import test from 'node:test'
import assert from 'node:assert/strict'
import { cashForecast, goalForecast, monthlyAverages } from './forecast.js'

const today = new Date(2026, 10, 19) // 19 November 2026
const ex = (date, amount) => ({ date, amount })
const inc = (date, amount) => ({ date, type: 'income', amount })

test('averages use the last whole months that have records, not this month and not empty ones', () => {
  const a = monthlyAverages({ expenses: [ex('2026-10-05', 40000), ex('2026-09-05', 60000), ex('2026-11-02', 999999)], bankTxns: [inc('2026-10-01', 100000), inc('2026-09-01', 100000), inc('2026-07-01', 50000)], today })
  assert.equal(a.spend, 50000) // October and September; this month is not finished
  assert.equal(a.income, 83333) // three months with a record: October, September and July (August is empty and skipped)
  assert.equal(a.months, 3)
})
test('no history gives zeros', () => assert.deepEqual(monthlyAverages({ today }), { income: 0, spend: 0, months: 0 }))
test('split expenses count their full amount', () => {
  const split = { date: '2026-10-05', amount: 1000, category: 'A', splits: [{ category: 'A', amount: 600 }, { category: 'B', amount: 400 }] }
  assert.equal(monthlyAverages({ expenses: [split], today }).spend, 1000)
})
test('cash forecast moves by the monthly net, starts next month, and finds the lowest and any shortfall', () => {
  const f = cashForecast({ cash: 100000, income: 80000, spend: 90000, months: 6, today })
  assert.equal(f.points[0].ym, '2026-12')
  assert.equal(f.points[5].ym, '2027-05')
  assert.equal(f.points[0].end, 90000)
  assert.equal(f.net, -10000)
  assert.equal(f.lowest.ym, '2027-05')
  assert.equal(f.runsOut, null)
  assert.equal(cashForecast({ cash: 15000, income: 80000, spend: 90000, months: 6, today }).runsOut.ym, '2027-01')
  assert.equal(cashForecast({ cash: 0, income: 10, spend: 0, today }).runsOut, null)
})
test('goals: shared saving, months to reach and whether it fits the date', () => {
  const g = goalForecast([{ id: 'a', name: 'Trip', remaining: 60000, monthsLeft: 6 }, { id: 'b', name: 'Car', remaining: 300000, monthsLeft: 12 }, { id: 'c', name: 'Done', remaining: 0, monthsLeft: 1 }], 20000)
  assert.equal(g.length, 2)
  assert.equal(g[0].share, 10000)
  assert.equal(g[0].monthsToReach, 6)
  assert.equal(g[0].onTrack, true)
  assert.equal(g[0].neededMonthly, 10000)
  assert.equal(g[1].onTrack, false) // 30 months at 10000 against 12 left
  assert.equal(goalForecast([{ id: 'a', name: 'x', remaining: 100, monthsLeft: null }], 0)[0].monthsToReach, null)
  assert.equal(goalForecast([{ id: 'a', name: 'x', remaining: 100, monthsLeft: null }], 50)[0].onTrack, null)
})
