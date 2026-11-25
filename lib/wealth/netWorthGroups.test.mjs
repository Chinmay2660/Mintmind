import test from 'node:test'
import assert from 'node:assert/strict'
import { netWorthGroups } from './netWorthGroups.js'

const base = {
  assetBreakdown: { bank: 300, mutualFunds: 500, gold: 50, realEstate: 1000 },
  bankAccounts: [{ id: 'b1', type: 'savings', bankName: 'HDFC Bank', currentBalance: 200 }, { id: 'c', type: 'cash', currentBalance: 100 }],
  cards: [{ id: 'k1', bank: 'HDFC', cardName: 'Regalia', outstanding: 40 }, { id: 'k2', bank: 'SBI', cardName: 'Simply', outstanding: 0 }],
  liabilities: [{ id: 'l1', name: 'Home loan', outstanding: 900 }],
  cover: 5000, coverCount: 2, labels: { mutualFunds: 'Mutual funds', gold: 'Gold', realEstate: 'Real estate' },
}

test('assets are grouped: investments, banks, property, and insurance cover', () => {
  const { assets } = netWorthGroups(base)
  assert.deepEqual(assets.map((g) => g.key), ['invest', 'banks', 'property', 'insurance'])
  assert.equal(assets[0].value, 550)
  assert.deepEqual(assets[0].children.map((c) => c.label), ['Mutual funds', 'Gold'])
  assert.equal(assets[1].value, 300)
  assert.equal(assets[2].value, 1000)
})
test('insurance cover is listed but marked as not counted', () => {
  const ins = netWorthGroups(base).assets.find((g) => g.key === 'insurance')
  assert.equal(ins.uncounted, true)
  assert.equal(ins.value, 5000)
})
test('liabilities are credit cards and loans; zero balances are left out', () => {
  const { liabilities } = netWorthGroups(base)
  assert.deepEqual(liabilities.map((g) => g.key), ['cards', 'loans'])
  assert.equal(liabilities[0].children.length, 1)
  assert.equal(liabilities[1].value, 900)
})
test('empty groups do not appear', () => {
  const { assets, liabilities } = netWorthGroups({})
  assert.equal(assets.length, 0)
  assert.equal(liabilities.length, 0)
})

test('a mutual fund row carries its one-day change; rows without a daily price do not', () => {
  const funds = [{ units: 100, currentNav: 10.5, prevNav: 10 }, { units: 50, currentNav: 20, prevNav: 0 }]
  const inv = netWorthGroups({ ...base, funds }).assets.find((g) => g.key === 'invest')
  const mf = inv.children.find((c) => c.key === 'mutualFunds')
  assert.equal(mf.dayChange, 50)
  assert.equal(mf.dayPct, 5)
  assert.equal(inv.children.find((c) => c.key === 'gold').dayChange, null)
})

test("a bank account shows today's movement, and a card shows charges minus payments (marked inverted)", () => {
  const g = netWorthGroups({
    ...base, todayIso: '2026-11-25',
    balanceHistory: [{ accountId: 'b1', date: '2026-11-24', balance: 150 }, { accountId: 'b1', date: '2026-11-25', balance: 200 }],
    expenses: [{ mode: 'card', cardId: 'k1', date: '2026-11-25', amount: 30 }, { mode: 'card', cardId: 'k1', date: '2026-11-20', amount: 999 }],
    cardPayments: [{ cardId: 'k1', date: '2026-11-25', amount: 10 }],
  })
  const bank = g.assets.find((x) => x.key === 'banks').children.find((c) => c.key === 'b1')
  assert.equal(bank.dayChange, 50)
  const card = g.liabilities.find((x) => x.key === 'cards').children[0]
  assert.equal(card.dayChange, 20)
  assert.equal(card.inverted, true)
})
test('no movement today means nothing is shown', () => {
  const g = netWorthGroups({ ...base, todayIso: '2026-11-25', balanceHistory: [{ accountId: 'b1', date: '2026-11-24', balance: 200 }] })
  assert.equal(g.assets.find((x) => x.key === 'banks').children.find((c) => c.key === 'b1').dayChange, null)
})
