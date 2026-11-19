import test from 'node:test'
import assert from 'node:assert/strict'
import { allocation, leverageMetrics } from './leverage.js'

const base = {
  assets: 5000000, liabilities: 2000000, bank: 300000, monthlyIncome: 150000,
  loans: [{ name: 'Home', outstanding: 1800000, emi: 40000, rate: 8.5, linkedAssetId: 'h' }, { name: 'Car', outstanding: 200000, emi: 10000, rate: 10 }],
  assetList: [{ id: 'h', name: 'Flat', category: 'realEstate', value: 4000000 }],
  cards: [{ limit: 100000, outstanding: 25000 }],
}

test('ratios', () => {
  const m = leverageMetrics(base)
  assert.equal(m.netWorth, 3000000)
  assert.equal(m.debtToAssetsPct, 40)
  assert.equal(m.debtToNetWorthPct, 66.7)
  assert.equal(m.leverageMultiple, 1.67)
})
test('repayments against income, with a band', () => {
  const m = leverageMetrics(base)
  assert.equal(m.monthlyRepayments, 50000)
  assert.equal(m.emiToIncomePct, 33.3)
  assert.equal(m.emiBand, 'watch')
  assert.equal(leverageMetrics({ ...base, monthlyIncome: 400000 }).emiBand, 'comfortable')
  assert.equal(leverageMetrics({ ...base, monthlyIncome: 100000 }).emiBand, 'high')
})
test('average rate is weighted by balance', () => {
  assert.equal(leverageMetrics(base).weightedRatePct, 8.65)
})
test('secured loan against its asset, card use and cash cover', () => {
  const m = leverageMetrics(base)
  assert.equal(m.secured.length, 1)
  assert.equal(m.secured[0].ltvPct, 45)
  assert.equal(m.cardUtilisationPct, 25)
  assert.equal(m.liquidCoveragePct, 15)
  assert.equal(m.monthsOfRepaymentsInCash, 6)
})
test('missing inputs are null, not zero; negative net worth has no multiple', () => {
  const m = leverageMetrics({ assets: 0, liabilities: 0 })
  assert.equal(m.debtToAssetsPct, null)
  assert.equal(m.emiToIncomePct, null)
  assert.equal(m.weightedRatePct, null)
  assert.equal(leverageMetrics({ assets: 100, liabilities: 300 }).leverageMultiple, null)
})
test('allocation shares, largest first', () => {
  const a = allocation({ bank: 100, mutualFunds: 300, gold: 0, epf: 100 })
  assert.deepEqual(a.map((x) => [x.key, x.pct]), [['mutualFunds', 60], ['bank', 20], ['epf', 20]])
})
