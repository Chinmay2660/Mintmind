import test from 'node:test'
import assert from 'node:assert/strict'
import { checkSplits, expenseParts, mainCategory } from './splits.js'
import { categoryTotals } from './selectors.js'

test('a plain expense is one part, a valid split is its parts', () => {
  assert.deepEqual(expenseParts({ amount: 500, category: 'Food' }), [{ category: 'Food', amount: 500 }])
  const e = { amount: 1000, category: 'Groceries', splits: [{ category: 'Groceries', amount: 700 }, { category: 'Household', amount: 300 }] }
  assert.deepEqual(expenseParts(e), e.splits)
})
test('splits that do not add up are ignored, so totals are never wrong', () => {
  const e = { amount: 1000, category: 'Groceries', splits: [{ category: 'Groceries', amount: 700 }, { category: 'Household', amount: 200 }] }
  assert.deepEqual(expenseParts(e), [{ category: 'Groceries', amount: 1000 }])
  assert.deepEqual(expenseParts({ amount: 10, category: 'X', splits: [{ category: 'A', amount: 10 }] }), [{ category: 'X', amount: 10 }])
})
test('checking a split', () => {
  assert.equal(checkSplits(1000, [{ category: 'A', amount: 600 }, { category: 'B', amount: 400 }]).ok, true)
  const short = checkSplits(1000, [{ category: 'A', amount: 600 }, { category: 'B', amount: 300 }])
  assert.equal(short.ok, false); assert.equal(short.left, 100); assert.match(short.error, /100 is still unassigned/)
  assert.match(checkSplits(1000, [{ category: 'A', amount: 800 }, { category: 'B', amount: 300 }]).error, /100 more/)
  assert.match(checkSplits(1000, [{ category: 'A', amount: 1000 }]).error, /at least two/)
  // the same category twice is merged, and blank rows are skipped
  const m = checkSplits(1000, [{ category: 'A', amount: 300 }, { category: 'A', amount: 300 }, { category: 'B', amount: 400 }, { category: '', amount: 5 }])
  assert.equal(m.ok, true); assert.deepEqual(m.splits, [{ category: 'A', amount: 600 }, { category: 'B', amount: 400 }])
  assert.equal(checkSplits(100.1, [{ category: 'A', amount: 50.05 }, { category: 'B', amount: 50.05 }]).ok, true) // paise do not drift
})
test('main category is the biggest part', () => assert.equal(mainCategory([{ category: 'A', amount: 100 }, { category: 'B', amount: 900 }]), 'B'))
test('month category totals count each part under its own category', () => {
  const ex = [{ date: '2026-06-02', amount: 1000, category: 'Groceries', splits: [{ category: 'Groceries', amount: 700 }, { category: 'Household', amount: 300 }] }, { date: '2026-06-03', amount: 200, category: 'Food' }]
  assert.deepEqual(categoryTotals(ex, '2026-06'), { Groceries: 700, Household: 300, Food: 200 })
})

import { categoryBreakdown, buildTransactions } from './transactions.js'
test('the category breakdown splits a split expense and keeps the total', () => {
  const expenses = [{ id: 'e1', date: '2026-06-02', amount: 1000, category: 'Groceries', mode: 'cash', splits: [{ category: 'Groceries', amount: 700 }, { category: 'Household', amount: 300 }] }, { id: 'e2', date: '2026-06-03', amount: 200, category: 'Food', mode: 'cash' }]
  const b = categoryBreakdown(buildTransactions({ expenses }), 'expense')
  assert.deepEqual(b.map((x) => [x.name, x.value]), [['Groceries', 700], ['Household', 300], ['Food', 200]])
  assert.equal(b.reduce((s, x) => s + x.pct, 0) > 99, true)
})
