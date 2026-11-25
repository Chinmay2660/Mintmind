import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReport, sheetNames, REPORTS } from './reports.js'

const today = new Date(2026, 10, 25)
const data = {
  bankAccounts: [{ id: 'b1', type: 'savings', bankName: 'HDFC Bank', nickname: 'Primary', currentBalance: 1000 }, { id: 'c', type: 'cash', currentBalance: 200 }],
  cards: [{ id: 'k1', bank: 'HDFC', cardName: 'Regalia', limit: 50000, outstanding: 300 }],
  funds: [{ id: 'f1', name: 'Fund A', folio: '1', units: 10, currentNav: 12, invested: 100, currentValue: 120 }],
  fundTxns: [], sips: [{ fundId: 'f1', amount: 500, frequency: 'monthly', debitDay: 5, status: 'active' }],
  assets: [{ id: 'a1', name: 'Gold bars', category: 'gold', value: 5000 }],
  liabilities: [{ id: 'l1', name: 'Car loan', category: 'carLoan', outstanding: 2000, emi: 150 }],
  policies: [{ id: 'p1', policyName: 'Health', company: 'Star', type: 'health', sumAssured: 100000, premium: 900, frequency: 'yearly' }],
  expenses: [
    { id: 'e1', date: '2026-11-03', amount: 400, category: 'Food', note: 'Lunch', mode: 'upi', accountId: 'b1' },
    { id: 'e2', date: '2026-10-20', amount: 999, category: 'Food', note: 'Old', mode: 'upi', accountId: 'b1' },
  ],
  bankTxns: [{ id: 'i1', type: 'income', date: '2026-11-01', amount: 5000, category: 'Salary', accountId: 'b1', description: 'Pay' }],
  transfers: [], snapshots: [{ date: '2026-10-31', assets: 9000, liabilities: 2000, netWorth: 7000 }],
  budgets: [{ id: '2026-11', total: 10000, categories: { Food: 2000 } }], meta: [],
}

test('every report has a title and can be built', () => {
  for (const r of REPORTS) { const rep = buildReport(r.key, data, { today }); assert.equal(rep.title, r.title); assert.ok(rep.sheets.length > 0) }
})

test('the net worth report adds up', () => {
  const rep = buildReport('networth', data, { today })
  const rows = Object.fromEntries(rep.sheets[0].rows)
  assert.equal(rows['Net worth'], rows['Total assets'] - rows['Total liabilities'])
  assert.equal(rep.sheets.find((s) => s.name === 'History').rows.length, 1)
})

test('transactions are limited to the period, expenses are negative, and the summary matches', () => {
  const rep = buildReport('transactions', data, { from: '2026-11-01', to: '2026-11-30', today })
  const tx = rep.sheets.find((s) => s.name === 'Transactions').rows
  assert.equal(tx.length, 2) // the October expense is outside the period
  assert.equal(tx.find((r) => r[1] === 'Expense')[5], -400)
  assert.equal(tx.find((r) => r[1] === 'Income')[5], 5000)
  const sum = Object.fromEntries(rep.sheets.find((s) => s.name === 'Summary').rows)
  assert.equal(sum.Net, 4600)
})

test('the budget report shows spent against the limit for the month of the end date', () => {
  const rep = buildReport('budget', data, { to: '2026-11-30', today })
  const food = rep.sheets[0].rows.find((r) => r[0] === 'Food')
  assert.deepEqual([food[1], food[2], food[3]], [2000, 400, 1600])
})

test('a month with no budget says so instead of failing', () => {
  const rep = buildReport('budget', data, { to: '2026-09-30', today })
  assert.match(rep.sheets[0].rows[0][0], /No budget/)
})

test('investments and accounts list what is held', () => {
  const inv = buildReport('investments', data, { today })
  assert.equal(inv.sheets[0].rows[0][5], 120)
  assert.equal(inv.sheets.find((s) => s.name === 'Other holdings').rows[0][0], 'Gold bars')
  const acc = buildReport('accounts', data, { today })
  assert.equal(acc.sheets.find((s) => s.name === 'Bank accounts').rows.length, 2)
})

test('sheet names are safe for Excel: no bad characters, at most 31 long, no duplicates', () => {
  const names = sheetNames([{ name: 'Gain/Loss: 2026?' }, { name: 'a'.repeat(40) }, { name: 'Same' }, { name: 'same' }])
  assert.ok(names.every((x) => x.length <= 31 && !/[\\/?*[\]:]/.test(x)))
  assert.equal(new Set(names.map((x) => x.toLowerCase())).size, 4)
})
