import test from 'node:test'
import assert from 'node:assert/strict'
import { sipFutureValue, goalSip, emi, prepayment, retirementCorpus, rentVsBuy } from './calculators.js'

test('SIP future value and the SIP needed for a goal agree', () => {
  const fv = sipFutureValue({ monthly: 10000, annualReturnPct: 12, years: 10 })
  assert.equal(fv.invested, 1200000)
  assert.ok(fv.futureValue > 2_250_000 && fv.futureValue < 2_350_000, String(fv.futureValue)) // ~23.2 L
  const need = goalSip({ target: fv.futureValue, annualReturnPct: 12, years: 10 })
  assert.ok(Math.abs(need - 10000) <= 2, String(need))
  assert.equal(goalSip({ target: 100, annualReturnPct: 10, years: 5, existing: 1000 }), 0)
})

test('EMI and prepayment', () => {
  assert.equal(emi({ principal: 1000000, annualRatePct: 10, years: 20 }), 9650)
  const p = prepayment({ principal: 2500000, annualRatePct: 9, years: 20, extraMonthly: 5000 })
  assert.ok(p.interestSaved > 0 && p.monthsSaved > 0)
  assert.equal(prepayment({ principal: 1000000, annualRatePct: 9, years: 10 }).interestSaved, 0)
})

test('retirement corpus and rent vs buy are deterministic', () => {
  const r = retirementCorpus({ monthlyExpenseToday: 50000, currentAge: 30, retireAge: 60 })
  assert.equal(r.yearsToRetire, 30)
  assert.ok(r.corpus > r.yearlyExpenseAtRetirement * 24)
  const v = rentVsBuy({ price: 8000000, downPaymentPct: 20, loanRatePct: 9, loanYears: 20, monthlyRent: 25000, years: 15 })
  assert.ok(['buy', 'rent'].includes(v.better))
  assert.ok(v.emi > 0 && v.buyNetWorth > 0 && v.rentNetWorth > 0)
})
