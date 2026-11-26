import test from 'node:test'
import assert from 'node:assert/strict'
import { fdValue, fdDetails, assetValue, assetGain, goldValue, loanMonthsLeft, loanRepaidPct, equityIn, rdDetails, rdMaturityDate, epfTotal, etfDetails } from './holdings.js'

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

test('RD: instalments at the start of each month, quarterly compounding, frozen at maturity', () => {
  const rd = { category: 'rd', monthlyInstalment: 10000, ratePct: 7, startDate: '2025-01-01', tenureMonths: 12 }
  const d = rdDetails(rd, new Date(2025, 6, 1)) // 6 whole months later: instalments 1..7
  assert.equal(d.paid, 7); assert.equal(d.invested, 70000); assert.ok(d.value > 70000 && d.interest > 0)
  const end = rdDetails(rd, new Date(2026, 5, 1)) // past maturity
  assert.equal(end.paid, 12); assert.equal(end.invested, 120000); assert.equal(end.value, end.maturityValue); assert.ok(end.matured)
  assert.ok(end.maturityValue > 120000 && end.maturityValue < 126000) // ~7% on a year of instalments
  assert.equal(rdDetails(rd, new Date(2024, 0, 1)).value, 0) // not started
  assert.equal(assetValue(rd, new Date(2025, 6, 1)), d.value)
  assert.equal(rdDetails({ ...rd, ratePct: 0 }, new Date(2025, 6, 1)).value, 70000)
})
test('EPF total is employee plus employer plus EPS', () => {
  const e = { category: 'epf', employeeShare: 400000, employerShare: 300000, epsShare: 150000, value: 1 }
  assert.equal(epfTotal(e), 850000); assert.equal(assetValue(e), 850000)
  assert.equal(assetValue({ category: 'epf', value: 500000 }), 500000) // no breakup: the typed amount stands
})
test('ETF value is units times the current NAV, cost is units times the average price', () => {
  const etf = { category: 'etf', units: 120, avgPrice: 52.5, currentNav: 61.2 }
  const d = etfDetails(etf)
  assert.equal(d.invested, 6300); assert.equal(d.value, 7344); assert.equal(d.gain, 1044); assert.equal(d.pct, 16.6)
  assert.equal(assetValue(etf), 7344)
  assert.equal(assetGain(etf).gain, 1044)
  assert.equal(etfDetails({ units: 10, avgPrice: 0, value: 900 }).gain, null) // no cost known: no gain shown
})
test('physical gold: purchase amount is the cost, current rate gives the value', () => {
  const g = { category: 'gold', grams: 20, karat: 22, paidAmount: 100000, rate24: 7500, value: 1 }
  assert.equal(assetValue(g), Math.round(20 * (22 / 24) * 7500))
  assert.equal(assetGain(g).invested, 100000)
})

test('renewing a matured FD starts it again with the maturity amount and keeps the old terms', async () => {
  const { renewFd, fdDetails } = await import('./holdings.js')
  const fd = { id: 'a1', category: 'fd', name: 'HDFC FD', principal: 100000, ratePct: 7, startDate: '2024-01-01', maturityDate: '2025-01-01' }
  const today = new Date('2026-06-01T00:00:00')
  const r = renewFd(fd, today)
  assert.equal(r.startDate, '2025-01-01')
  assert.equal(r.maturityDate, '')
  assert.equal(r.principal, fdDetails(fd, today).maturityValue)
  assert.ok(r.principal > 100000)
  assert.deepEqual(r.renewals, [{ date: '2025-01-01', principal: 100000, ratePct: 7, maturityValue: r.principal }])
  assert.equal(r.ratePct, 7)
  // not matured, not an FD, or no dates: nothing to renew
  assert.equal(renewFd({ ...fd, maturityDate: '2030-01-01' }, today), null)
  assert.equal(renewFd({ ...fd, category: 'ppf' }, today), null)
  assert.equal(renewFd({ ...fd, maturityDate: '' }, today), null)
})

test('an FD term of exactly one year compounds for exactly one year, leap year or not', () => {
  const mk = (start, end) => ({ category: 'fd', principal: 100000, ratePct: 7, startDate: start, maturityDate: end })
  const t = new Date('2030-01-01T00:00:00')
  const expected = Math.round(100000 * Math.pow(1.0175, 4)) // 1,07,186
  assert.equal(fdDetails(mk('2024-01-01', '2025-01-01'), t).maturityValue, expected) // a leap year in the term
  assert.equal(fdDetails(mk('2025-01-01', '2026-01-01'), t).maturityValue, expected)
  assert.equal(fdValue(mk('2024-01-01', '2025-01-01'), t), expected) // frozen at maturity
  // a part year still counts the extra days over 365: 6 months and 10 days is a little over half a year
  const part = fdDetails(mk('2025-01-01', '2025-07-11'), new Date('2030-01-01T00:00:00')).maturityValue
  assert.ok(part > Math.round(100000 * Math.pow(1.0175, 2)) && part < Math.round(100000 * Math.pow(1.0175, 2) * 1.004))
})

test('a deposit entered with only a value counts as that value, with no interest, instead of zero', () => {
  const d = fdDetails({ category: 'fd', value: 1000000 }, new Date(2026, 10, 25))
  assert.equal(d.principal, 1000000)
  assert.equal(d.value, 1000000)
  assert.equal(d.interest, 0)
  assert.equal(d.maturityValue, null)
})
test('a deposit with a principal, rate and dates still earns interest', () => {
  const d = fdDetails({ category: 'fd', principal: 100000, ratePct: 8, startDate: '2025-11-25', maturityDate: '2027-11-25', value: 100000 }, new Date(2026, 10, 25))
  assert.ok(d.value > 100000)
  assert.ok(d.interest > 0)
  assert.ok(d.maturityValue > d.value)
})

test('a recurring deposit matures on its start date plus the tenure, clamped to the month end', () => {
  assert.equal(rdMaturityDate({ startDate: '2025-03-15', tenureMonths: 24 }), '2027-03-15')
  assert.equal(rdMaturityDate({ startDate: '2025-01-31', tenureMonths: 1 }), '2025-02-28')
  assert.equal(rdMaturityDate({ startDate: '2025-01-31' }), null)
})
