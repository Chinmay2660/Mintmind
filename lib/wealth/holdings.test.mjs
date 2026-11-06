import test from 'node:test'
import assert from 'node:assert/strict'
import { fdValue, fdDetails, assetValue, assetGain, goldValue, loanMonthsLeft, loanRepaidPct, equityIn } from './holdings.js'

const today = new Date(2026, 0, 1)
test('FD accrues with quarterly compounding and freezes at maturity', () => {
  const fd = { category: 'fd', principal: 100000, ratePct: 8, startDate: '2025-01-01', maturityDate: '2027-01-01' }
  const v = fdValue(fd, today)
  assert.ok(v > 108000 && v < 108500, String(v)) // ~8.24% effective for one year
  assert.equal(assetValue(fd, today), v)
  const matured = { ...fd, maturityDate: '2025-07-01' }
  assert.equal(fdValue(matured, new Date(2030, 0, 1)), fdValue(matured, new Date(2031, 0, 1)))
  const d = fdDetails(fd, today)
  assert.equal(d.daysLeft, 365); assert.ok(d.maturityValue > v)
  assert.equal(fdValue({ ...fd, startDate: '2026-06-01' }, today), 100000) // not started yet
})
test('gold follows grams, purity and the current 24K rate', () => {
  const g = { category: 'gold', grams: 50, karat: 22, rate24: 7000, buyPricePerGram: 5000, value: 1 }
  assert.equal(goldValue(g), Math.round(50 * (22 / 24) * 7000))
  assert.equal(assetValue(g), 320833)
  assert.equal(assetValue({ ...g, manualValue: true }), 1)
  const gain = assetGain(g)
  assert.equal(gain.invested, 250000); assert.ok(gain.gain > 0)
  assert.equal(assetValue({ category: 'gold', value: 200000 }), 200000) // no rate yet: keeps the typed value
})
test('loans: months left, repaid share, equity in a financed asset', () => {
  const l = { outstanding: 1755000, emi: 38500, rate: 8.65, principal: 3000000, linkedAssetId: 'flat' }
  const m = loanMonthsLeft(l)
  assert.equal(m, 56)
  assert.equal(loanMonthsLeft({ outstanding: 100000, emi: 500, rate: 12 }), null) // EMI below interest
  assert.equal(loanRepaidPct(l), 42)
  assert.equal(equityIn({ id: 'flat', value: 4500000 }, [l]), 4500000 - 1755000)
})
