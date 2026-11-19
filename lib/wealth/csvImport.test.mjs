import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, parseDate, parseAmount, detectColumns, toTransactions } from './csvImport.js'

test('CSV: quotes, commas inside quotes, doubled quotes and blank lines', () => {
  const rows = parseCsv('Date,Description,Amount\r\n2026-11-05,"Dinner, with ""friends""",-1250.50\n\n2026-11-06,Salary,185000\n')
  assert.deepEqual(rows[0], ['Date', 'Description', 'Amount'])
  assert.equal(rows[1][1], 'Dinner, with "friends"')
  assert.equal(rows.length, 3)
  assert.equal(parseCsv('﻿a;b\n1;2')[1][1], '2') // BOM and semicolons
})
test('dates: ISO, day first, month first, and words', () => {
  assert.equal(parseDate('2026-11-05'), '2026-11-05')
  assert.equal(parseDate('05/11/2026'), '2026-11-05')
  assert.equal(parseDate('05/11/2026', { monthFirst: true }), '2026-05-11')
  assert.equal(parseDate('5 Nov 2026'), '2026-11-05')
  assert.equal(parseDate('05-11-26'), '2026-11-05')
  assert.equal(parseDate('31/02/2026'), null) // not a real day
  assert.equal(parseDate('soon'), null)
})
test('amounts: symbols, commas, brackets, Dr and Cr', () => {
  assert.equal(parseAmount('₹1,500.50'), 1500.5)
  assert.equal(parseAmount('-250'), -250)
  assert.equal(parseAmount('(250)'), -250)
  assert.equal(parseAmount('250 Dr'), -250)
  assert.equal(parseAmount('250 Cr'), 250)
  assert.equal(parseAmount('abc'), null)
  assert.equal(parseAmount(''), null)
})
test('columns are found from the header', () => {
  const m = detectColumns(['Txn Date', 'Narration', 'Withdrawal Amt.', 'Deposit Amt.', 'Balance'])
  assert.equal(m.date, 0); assert.equal(m.description, 1); assert.equal(m.debit, 2); assert.equal(m.credit, 3)
})
test('rows become transactions: sign decides the kind, bad rows are reported', () => {
  const rows = [['2026-11-05', 'Swiggy', '-450'], ['2026-11-06', 'Salary', '185000'], ['nope', 'X', '5'], ['2026-11-07', 'Empty', '']]
  const { items, skipped } = toTransactions(rows, { date: 0, description: 1, amount: 2, debit: -1, credit: -1, category: -1 })
  assert.deepEqual(items.map((i) => [i.kind, i.amount]), [['expense', 450], ['income', 185000]])
  assert.equal(skipped.length, 2)
  assert.equal(toTransactions(rows.slice(0, 1), { date: 0, description: 1, amount: 2, debit: -1, credit: -1, category: -1 }, { invert: true }).items[0].kind, 'income')
})
test('separate debit and credit columns', () => {
  const rows = [['05/11/2026', 'ATM', '2,000.00', ''], ['06/11/2026', 'Interest', '', '120.00']]
  const { items } = toTransactions(rows, { date: 0, description: 1, debit: 2, credit: 3, amount: -1, category: -1 })
  assert.deepEqual(items.map((i) => [i.kind, i.amount, i.date]), [['expense', 2000, '2026-11-05'], ['income', 120, '2026-11-06']])
})
