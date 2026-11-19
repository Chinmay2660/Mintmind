import test from 'node:test'
import assert from 'node:assert/strict'
import { budgetRows } from './budgetRows.js'

const exp = (date, category, amount) => ({ id: date + category + amount, date, category, amount })
const today = new Date(2026, 5, 19) // 19 June 2026, a 30 day month

test('30000 over 30 days on the 19th allows 19000 so far', () => {
  const { total, days, dayToday } = budgetRows({ budget: { total: 30000, categories: {} }, expenses: [exp('2026-06-05', 'Food', 12000)], ym: '2026-06', today })
  assert.equal(days, 30)
  assert.equal(dayToday, 19)
  assert.equal(total.allowedToDate, 19000)
  assert.equal(total.remaining, 18000)
  assert.equal(total.canSpendNow, 7000)
  assert.equal(total.status, 'under')
})

test('status: over pace, exceeded and no limit', () => {
  const { rows } = budgetRows({ budget: { total: 30000, categories: { Food: 3000, Travel: 1000 } }, expenses: [exp('2026-06-02', 'Food', 2500), exp('2026-06-03', 'Travel', 1500), exp('2026-06-04', 'Misc', 200)], ym: '2026-06', today })
  const by = Object.fromEntries(rows.map((r) => [r.category, r]))
  assert.equal(by.Food.status, 'over') // pace is 1900
  assert.equal(by.Travel.status, 'exceeded')
  assert.equal(by.Misc.status, 'none')
  assert.equal(by.Food.canSpendNow, 0)
})

test('change against the previous month, increase and decrease', () => {
  const { rows } = budgetRows({ budget: { total: 0, categories: { Food: 5000 } }, expenses: [exp('2026-05-10', 'Food', 1000), exp('2026-06-10', 'Food', 1500), exp('2026-05-11', 'Bills', 800)], ym: '2026-06', today })
  const by = Object.fromEntries(rows.map((r) => [r.category, r]))
  assert.equal(by.Food.change, 500)
  assert.equal(by.Food.changePct, 50)
})

test('a past month allows the whole limit and a future month nothing', () => {
  assert.equal(budgetRows({ budget: { total: 3000 }, expenses: [], ym: '2026-04', today }).total.allowedToDate, 3000)
  assert.equal(budgetRows({ budget: { total: 3000 }, expenses: [], ym: '2026-08', today }).total.allowedToDate, 0)
})

test('sub categories roll up into their parent', () => {
  const { rows } = budgetRows({ budget: { total: 0, categories: { 'Food > Dining': 2000, 'Food > Groceries': 4000 } }, expenses: [exp('2026-06-02', 'Food > Dining', 500), exp('2026-06-03', 'Food > Groceries', 1000), exp('2026-06-04', 'Food', 100)], ym: '2026-06', today })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].category, 'Food')
  assert.equal(rows[0].limit, 6000)
  assert.equal(rows[0].spent, 1600)
  assert.deepEqual(rows[0].children.map((c) => c.category), ['Food > Groceries', 'Food > Dining'])
})

test('rollover applies only to the categories chosen', () => {
  const prevBudget = { categories: { Food: 5000, Travel: 3000 } }
  const budget = { total: 0, categories: { Food: 5000, Travel: 3000 }, rolloverCats: ['Food'] }
  const { rows } = budgetRows({ budget, prevBudget, expenses: [exp('2026-05-10', 'Food', 3500), exp('2026-05-11', 'Travel', 1000)], ym: '2026-06', today })
  const by = Object.fromEntries(rows.map((r) => [r.category, r]))
  assert.equal(by.Food.limit, 6500) // 1500 unspent carried
  assert.equal(by.Food.carry, 1500)
  assert.equal(by.Travel.limit, 3000) // not chosen, nothing carried
})

test('an overspent category carries nothing and never goes negative', () => {
  const { rows } = budgetRows({ budget: { categories: { Food: 1000 }, rolloverCats: ['Food'] }, prevBudget: { categories: { Food: 1000 } }, expenses: [exp('2026-05-10', 'Food', 1800)], ym: '2026-06', today })
  assert.equal(rows[0].limit, 1000)
})

test('a yearly budget counts the whole year against the full limit', () => {
  const budget = { total: 0, categories: { Vacation: 120000 }, periods: { Vacation: 'yearly' } }
  const { rows } = budgetRows({ budget, expenses: [exp('2026-02-10', 'Vacation', 30000), exp('2026-06-05', 'Vacation', 10000)], ym: '2026-06', today })
  const v = rows[0]
  assert.equal(v.period, 'yearly')
  assert.equal(v.spent, 40000) // since 1 January
  assert.equal(v.monthSpent, 10000)
  assert.equal(v.allowedToDate, Math.round((120000 / 365) * 170)) // 31+28+31+30+31 days gone, plus 19
  assert.equal(v.status, 'under')
})

test('a quarterly budget starts again each quarter', () => {
  const budget = { total: 0, categories: { Trips: 9000 }, periods: { Trips: 'quarterly' } }
  const { rows } = budgetRows({ budget, expenses: [exp('2026-03-20', 'Trips', 5000), exp('2026-04-20', 'Trips', 2000), exp('2026-06-05', 'Trips', 1000)], ym: '2026-06', today })
  assert.equal(rows[0].spent, 3000) // April to June only
  assert.equal(rows[0].limit, 9000)
})

test('a custom date range counts only its own days', () => {
  const budget = { total: 0, categories: { Trip: 20000 }, periods: { Trip: 'custom' }, customRanges: { Trip: { start: '2026-06-10', end: '2026-06-29' } } }
  const { rows } = budgetRows({ budget, expenses: [exp('2026-06-09', 'Trip', 999), exp('2026-06-12', 'Trip', 5000), exp('2026-06-18', 'Trip', 3000), exp('2026-07-01', 'Trip', 777)], ym: '2026-06', today })
  const t = rows[0]
  assert.equal(t.spent, 8000)
  assert.equal(t.allowedToDate, 10000) // 20 days, 10 gone (10th to 19th), 20000 / 20 * 10
})
