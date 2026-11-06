import test from 'node:test'
import assert from 'node:assert/strict'
import { sipFutureValue, goalSip, emi, prepayment, retirementCorpus, rentVsBuy, lumpsumFuture, cagr, emergencyFund, termCover, budgetRule, loanPayoff } from './calculators.js'

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

test('lumpsum, CAGR and budget split', () => {
  const o = lumpsumFuture({ amount: 100000, annualReturnPct: 10, years: 10 })
  assert.ok(Math.abs(o.futureValue - 259374) <= 1)
  assert.ok(Math.abs(cagr({ start: 100, end: 200, years: 7 }) - 10.4) < 0.1)
  assert.equal(cagr({ start: 0, end: 1, years: 1 }), null)
  assert.deepEqual(budgetRule({ income: 100000 }), { needs: 50000, wants: 30000, savings: 20000, savingsPct: 20 })
})

test('emergency fund and term cover', () => {
  const e = emergencyFund({ monthlyExpense: 50000, savings: 150000, targetMonths: 6, monthlySaving: 25000 })
  assert.equal(e.target, 300000); assert.equal(e.coveredMonths, 3); assert.equal(e.monthsToTarget, 6)
  assert.equal(termCover({ annualIncome: 1000000, years: 10, debts: 500000, existingCover: 2000000 }).gap, 8500000)
})

test('loan payoff: extra money shortens it and avalanche never pays more interest than snowball', () => {
  const loans = [{ balance: 500000, ratePct: 12, emi: 12000 }, { balance: 100000, ratePct: 8, emi: 4000 }]
  const none = loanPayoff({ loans })
  const extra = loanPayoff({ loans, extraMonthly: 10000 })
  assert.ok(extra.months < none.months && extra.interest < none.interest)
  assert.ok(loanPayoff({ loans, extraMonthly: 10000, strategy: 'avalanche' }).interest <= loanPayoff({ loans, extraMonthly: 10000, strategy: 'snowball' }).interest)
})
