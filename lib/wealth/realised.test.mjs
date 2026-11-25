import test from 'node:test'
import assert from 'node:assert/strict'
import { realisedGains, portfolioRealised, applyRedemption } from './realised.js'

const buy = (date, units, amount) => ({ fundId: 'f1', date, type: 'lumpsum', units, amount })
const sell = (date, units, amount) => ({ fundId: 'f1', date, type: 'redeem', units, amount })

test('selling part of a holding: gain is proceeds minus the average cost of the units sold', () => {
  // 100 units for 10,000 then 100 units for 14,000: average cost 120 per unit. Sell 50 units for 8,000 (cost 6,000).
  const g = realisedGains([buy('2024-01-01', 100, 10000), buy('2024-06-01', 100, 14000), sell('2025-01-01', 50, 8000)])
  assert.equal(g.realised, 2000)
  assert.equal(g.proceeds, 8000)
  assert.equal(g.soldCost, 6000)
  assert.equal(g.incomplete, false)
  assert.equal(g.sells.length, 1)
})

test('a loss is a negative realised gain, and a later sale uses the reduced average', () => {
  const g = realisedGains([buy('2024-01-01', 100, 10000), sell('2024-03-01', 50, 4000), sell('2024-09-01', 50, 6000)])
  // first: cost 5,000, got 4,000 => -1,000; remaining 50 units cost 5,000; second: got 6,000 => +1,000
  assert.deepEqual(g.sells.map((s) => s.gain), [-1000, 1000])
  assert.equal(g.realised, 0)
})

test('nothing sold means no realised figure; missing units or history is flagged, never guessed', () => {
  assert.equal(realisedGains([buy('2024-01-01', 100, 10000)]).hasSales, false)
  assert.equal(realisedGains([buy('2024-01-01', 0, 10000), sell('2024-02-01', 10, 1100)]).incomplete, true) // purchase without units
  assert.equal(realisedGains([sell('2024-02-01', 10, 1100)]).incomplete, true) // sold more than the history shows
  assert.equal(realisedGains([buy('2024-01-01', 100, 10000), sell('2024-02-01', 0, 1100)]).incomplete, true) // sale without units
})

test('the portfolio adds funds together and only flags incomplete funds that have sales', () => {
  const funds = [{ id: 'f1' }, { id: 'f2' }]
  const txns = [
    buy('2024-01-01', 100, 10000), sell('2024-06-01', 100, 12000),
    { fundId: 'f2', date: '2024-01-01', type: 'sip', units: 0, amount: 500 }, // no units, but nothing sold from f2
  ]
  const p = portfolioRealised(funds, txns)
  assert.equal(p.realised, 2000)
  assert.equal(p.hasSales, true)
  assert.equal(p.incomplete, false)
  assert.equal(portfolioRealised(funds, [buy('2024-01-01', 100, 10000)]).hasSales, false)
})

test('recording a redemption updates units and invested at average cost, and checks the entry', () => {
  const fund = { units: 200, invested: 24000, currentNav: 130 }
  const r = applyRedemption(fund, { date: '2025-01-01', units: 50, nav: 160 })
  assert.equal(r.txn.amount, 8000)
  assert.equal(r.gain, 2000)
  assert.equal(r.fund.units, 150)
  assert.equal(r.fund.invested, 18000)
  assert.equal(r.fund.purchaseNav, 120)
  assert.equal(r.fund.currentValue, 19500)
  assert.throws(() => applyRedemption(fund, { date: '2025-01-01', units: 250, nav: 160 }), /cannot sell/)
  assert.throws(() => applyRedemption(fund, { date: '2025-01-01', units: 0, nav: 160 }), /how many units/)
  assert.throws(() => applyRedemption(fund, { date: '2025-01-01', units: 10 }), /amount or the NAV/)
  assert.equal(applyRedemption(fund, { date: '2025-01-01', units: 200, amount: 30000 }).fund.invested, 0) // sold everything
})
