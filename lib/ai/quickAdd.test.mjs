import test from 'node:test'
import assert from 'node:assert/strict'
import { parseExpenseText } from './quickAdd.js'
import { unusualSpending } from './anomalies.js'

const today = new Date(2025, 5, 18) // Wed 18 Jun 2025
const cats = ['Food', 'Groceries', 'Travel', 'Other']
test('amount, category, mode and date from a sentence', () => {
  const r = parseExpenseText('450 lunch with card yesterday', { categories: cats, today })
  assert.deepEqual([r.amount, r.category, r.mode, r.date], [450, 'Food', 'card', '2025-06-17'])
  assert.equal(r.confident, true)
})
test('k units, explicit dates, weekdays, unknown category', () => {
  assert.equal(parseExpenseText('uber 1.2k cash', { categories: cats, today }).amount, 1200)
  assert.equal(parseExpenseText('₹2,500 groceries on 5 Jun', { categories: cats, today }).date, '2025-06-05')
  assert.equal(parseExpenseText('300 petrol last monday', { categories: cats, today }).date, '2025-06-16')
  const r = parseExpenseText('999 something odd', { categories: cats, today })
  assert.equal(r.category, 'Other'); assert.equal(r.confident, false)
})
test('no amount means no draft amount; empty input is null', () => {
  assert.equal(parseExpenseText('lunch', { categories: cats, today }).amount, null)
  assert.equal(parseExpenseText('  '), null)
})
test('date numbers are not mistaken for the amount', () => {
  assert.equal(parseExpenseText('dinner 5 jun 600', { categories: cats, today }).amount, 600)
})

const ex = (id, date, amount, category = 'Food') => ({ id, date, amount, category })
test('unusual spending: large outlier and duplicates', () => {
  const hist = [100, 120, 90, 110, 130].map((a, i) => ex('h' + i, `2025-04-${10 + i}`, a))
  const list = [...hist, ex('big', '2025-06-10', 4000), ex('ok', '2025-06-11', 150), ex('d1', '2025-06-12', 500), ex('d2', '2025-06-12', 500)]
  const r = unusualSpending(list, today)
  assert.ok(r.some((x) => x.id === 'big' && x.kind === 'large'))
  assert.ok(!r.some((x) => x.id === 'ok'))
  assert.ok(r.some((x) => x.kind === 'duplicate' && x.count === 2))
})
