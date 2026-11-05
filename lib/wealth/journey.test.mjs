import test from 'node:test'
import assert from 'node:assert/strict'
import { netWorthAttribution, rangeBase } from './journey.js'

const base = { date: '2026-05-10', netWorth: 5000000, assets: 6900000, liabilities: 1900000, assetBreakdown: { bank: 380000, mutualFunds: 800000, realEstate: 4500000 }, liabilityBreakdown: { homeLoan: 1800000, creditCards: 100000 } }
const current = { netWorth: 5200000, assets: 7100000, liabilities: 1900000 - 40000 - 0, assetBreakdown: { bank: 400000, mutualFunds: 900000, realEstate: 4500000, gold: 100000 }, liabilityBreakdown: { homeLoan: 1760000, creditCards: 100000 } }
// make totals consistent: assets 5,800,000 ; liabilities 1,860,000 -> net worth 3,940,000 is not used; use explicit totals below
const cur = { ...current, assets: 5900000, liabilities: 1860000, netWorth: 4040000 }
const b2 = { ...base, assets: 5680000, liabilities: 1900000, netWorth: 3780000 }

test('causes add up to the total change (nothing unexplained)', () => {
  const a = netWorthAttribution({ base: b2, current: cur, fundTxns: [{ date: '2026-06-01', type: 'sip', amount: 10000 }, { date: '2026-04-01', type: 'sip', amount: 99999 }] })
  assert.equal(a.diff, 260000)
  assert.equal(a.explained, 260000)
  assert.equal(a.unexplained, 0)
  const by = Object.fromEntries(a.causes.map((c) => [c.key, c.amount]))
  assert.equal(by['mf-invest'], 10000) // the April SIP predates the base snapshot
  assert.equal(by['mf-market'], 90000)
  assert.equal(by['loan-repaid'], 40000)
  assert.equal(by.bank, 20000)
  assert.equal(by['asset-gold'], 100000)
})

test('range picks the nearest earlier snapshot, else the first', () => {
  const snaps = [{ date: '2025-06-10' }, { date: '2026-05-10' }, { date: '2026-06-09' }]
  assert.equal(rangeBase(snaps, 'Month', new Date(2026, 5, 10)).date, '2026-05-10')
  assert.equal(rangeBase(snaps, 'Year', new Date(2026, 5, 10)).date, '2025-06-10')
  assert.equal(rangeBase(snaps, 'All').date, '2025-06-10')
  assert.equal(rangeBase([], 'Month'), null)
})
