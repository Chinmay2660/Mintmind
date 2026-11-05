import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTransactions, monthSummary, dailyTotals, groupByDay, categoryBreakdown, inMonth } from './transactions.js'

const input = {
  bankAccounts: [{ id: 'b1', bankName: 'HDFC', nickname: 'Primary' }, { id: 'cash', bankName: 'Cash', nickname: 'Cash in hand' }],
  cards: [{ id: 'c1', bank: 'HDFC', cardName: 'Regalia' }],
  expenses: [{ id: 'e1', date: '2026-06-02', amount: 500, category: 'Food', mode: 'upi' }, { id: 'e2', date: '2026-06-02', amount: 300, category: 'Travel', mode: 'cash' }],
  bankTxns: [{ id: 'i1', date: '2026-06-01', type: 'income', amount: 100000, category: 'Salary', accountId: 'b1' }],
  transfers: [
    { id: 't1', date: '2026-06-03', amount: 5000, fromType: 'account', fromId: 'b1', toType: 'account', toId: 'cash' },
    { id: 't2', date: '2026-06-04', amount: 20000, fromType: 'account', fromId: 'b1', toType: 'card', toId: 'c1' },
  ],
}

test('feed merges expenses, income and transfers, newest first', () => {
  const l = buildTransactions(input)
  assert.equal(l.length, 5)
  assert.equal(l[0].id, 't2')
  assert.equal(l.find((x) => x.id === 't1').sub, 'Primary → Cash in hand')
  assert.equal(l.find((x) => x.id === 't2').sub, 'Primary → HDFC Regalia')
})

test('transfers never count as income or expense', () => {
  const l = inMonth(buildTransactions(input), '2026-06')
  const s = monthSummary(l)
  assert.equal(s.income, 100000)
  assert.equal(s.expense, 800)
  assert.equal(s.transfer, 25000)
  assert.equal(s.net, 99200)
  assert.deepEqual(dailyTotals(l)['2026-06-02'], { income: 0, expense: 800 })
  assert.equal(dailyTotals(l)['2026-06-03'], undefined)
})

test('day grouping and category breakdown', () => {
  const l = buildTransactions(input)
  const g = groupByDay(l)
  assert.equal(g.find((x) => x.date === '2026-06-02').expense, 800)
  const b = categoryBreakdown(l, 'expense')
  assert.deepEqual(b.map((x) => x.name), ['Food', 'Travel'])
  assert.equal(b[0].pct, 62.5)
})
