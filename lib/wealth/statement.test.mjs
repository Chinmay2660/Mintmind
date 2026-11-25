import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStatement } from './statement.js'

const today = new Date(2026, 10, 19)
const data = {
  bankAccounts: [{ id: 'b1', nickname: 'Primary Savings', bankName: 'HDFC', accountNumber: '123456789012', currentBalance: 200000 }, { id: 'c', type: 'cash', nickname: 'Cash', currentBalance: 5000 }],
  funds: [{ id: 'f1', name: 'Flexi Cap Fund', currentValue: 300000 }],
  assets: [{ id: 'a1', category: 'fd', name: 'HDFC FD', value: 100000 }, { id: 'a2', category: 'realEstate', name: 'Flat', value: 5000000 }],
  liabilities: [{ id: 'l1', category: 'homeLoan', name: 'Home loan', outstanding: 2000000 }],
  cards: [{ id: 'k1', bank: 'ICICI', cardName: 'Amazon Pay', cardNumber: '4111111111111111', outstanding: 12000 }],
}

test('totals are the sum of the rows, and net worth is assets minus liabilities', () => {
  const s = buildStatement({ ...data, today })
  assert.equal(s.totalAssets, 5605000)
  assert.equal(s.totalLiabilities, 2012000)
  assert.equal(s.netWorth, 3593000)
  assert.equal(s.assets.reduce((n, g) => n + g.total, 0), s.totalAssets)
})
test('detailed lists each holding by its own name, summary folds them by kind', () => {
  const d = buildStatement({ ...data, today })
  assert.ok(d.assets.find((g) => g.name === 'Bank balances').items.some((r) => r.label === 'Primary Savings'))
  const sum = buildStatement({ ...data, detailed: false, today })
  assert.ok(sum.assets.every((g) => g.items.length === 1))
  assert.equal(sum.totalAssets, d.totalAssets)
  assert.equal(sum.netWorth, d.netWorth)
})
test('account and card numbers never appear', () => {
  const text = JSON.stringify(buildStatement({ ...data, today }))
  assert.ok(!text.includes('123456789012') && !text.includes('4111111111111111'))
})
test('zero rows and empty data are left out', () => {
  const s = buildStatement({ bankAccounts: [{ nickname: 'Empty', currentBalance: 0 }], liabilities: [{ category: 'carLoan', name: 'Paid off', outstanding: 0 }], today })
  assert.deepEqual([s.assets, s.liabilities, s.netWorth], [[], [], 0])
})
