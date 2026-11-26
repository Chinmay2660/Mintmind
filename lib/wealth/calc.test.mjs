import test from 'node:test'
import assert from 'node:assert/strict'
import { sipPaidThisCycle, budgetPacing, cardUtilisation, daysInMonth, computeNetWorth, nextSipDate, addMonths, portfolioSummary, availableBalance, mabShortfall } from './calc.js'

test('daysInMonth handles Feb and leap years', () => {
  assert.equal(daysInMonth(2025, 2), 28)
  assert.equal(daysInMonth(2024, 2), 29)
  assert.equal(daysInMonth(2025, 4), 30)
})

test('card utilisation 45,000 / 2,00,000 = 22.5%', () => {
  assert.equal(cardUtilisation(200000, 45000), 22.5)
  assert.equal(cardUtilisation(0, 10), 0)
})

test('budget pacing uses real calendar days; expected is not remaining', () => {
  const p = budgetPacing({
    budget: 28000, year: 2025, month: 2, today: '2025-02-10',
    expenses: [{ date: '2025-02-02', amount: 3000 }, { date: '2025-02-09', amount: 4000 }, { date: '2025-03-01', amount: 999 }],
  })
  assert.equal(p.days, 28)
  assert.equal(p.dailyBudget, 1000)
  assert.equal(p.expectedTillToday, 10000)
  assert.equal(p.spent, 7000)
  assert.equal(p.remaining, 21000)
  assert.equal(p.variance, -3000)
  assert.equal(p.status, 'under')
  assert.equal(p.projected, 19600)
  assert.equal(p.series[9].expected, 10000)
  assert.equal(p.series[9].actual, 7000)
  assert.equal(p.series[10].actual, null)
  assert.equal(p.utilisation, 25)
})

test('leap-year February pacing', () => {
  const p = budgetPacing({ budget: 29000, year: 2024, month: 2, today: '2024-02-29', expenses: [] })
  assert.equal(p.days, 29)
  assert.equal(p.series[28].expected, 29000)
})

test('net worth: cards and loans are liabilities', () => {
  const r = computeNetWorth({
    banks: [{ currentBalance: 445000 }],
    funds: [{ currentValue: 1850000 }],
    assets: [{ category: 'realEstate', value: 4500000 }],
    cards: [{ outstanding: 45000 }],
    liabilities: [{ category: 'homeLoan', outstanding: 1800000 }],
  })
  assert.equal(r.assets, 6795000)
  assert.equal(r.liabilities, 1845000)
  assert.equal(r.netWorth, 4950000)
})

test('sip next date and completion', () => {
  const sip = { status: 'active', frequency: 'monthly', startDate: '2024-01-05', debitDay: 5, instalmentsTotal: 12, instalmentsCompleted: 3 }
  assert.equal(nextSipDate(sip, '2024-06-10'), '2024-07-05')
  assert.equal(nextSipDate({ ...sip, instalmentsCompleted: 12 }, '2024-06-10'), null)
  assert.equal(nextSipDate({ ...sip, debitDay: 31, startDate: '2024-01-31' }, '2024-02-01'), '2024-02-29')
})

test('portfolio summary', () => {
  const s = portfolioSummary(
    [{ id: 'a', invested: 1000, currentValue: 1100, units: 10, currentNav: 110, prevNav: 108, investmentDate: '2024-01-01' }],
    [], [{ status: 'active', amount: 500, frequency: 'monthly' }], new Date(2025, 0, 1))
  assert.equal(s.absReturn, 100)
  assert.equal(s.absReturnPct, 10)
  assert.equal(s.todayGain, 20)
  assert.equal(s.monthlySipCommitment, 500)
})

test('available balance = current - MAB, floored at zero', () => {
  assert.equal(availableBalance({ currentBalance: 100000, mab: 10000 }), 90000)
  assert.equal(availableBalance({ currentBalance: 5000, mab: 10000 }), 0)
  assert.equal(mabShortfall({ currentBalance: 5000, mab: 10000 }), 5000)
  assert.equal(availableBalance({ type: 'cash', currentBalance: 700, mab: 500 }), 700)
  assert.equal(availableBalance({ currentBalance: 300 }), 300)
})

test('sipPaidThisCycle: once per week, month, quarter or year', () => {
  const t = new Date(2026, 10, 26) // Thu 26 Nov 2026
  assert.equal(sipPaidThisCycle({ frequency: 'monthly' }, t), false)
  assert.equal(sipPaidThisCycle({ frequency: 'monthly', lastPaidDate: '2026-11-05' }, t), true)
  assert.equal(sipPaidThisCycle({ frequency: 'monthly', lastPaidDate: '2026-10-30' }, t), false)
  assert.equal(sipPaidThisCycle({ frequency: 'weekly', lastPaidDate: '2026-11-23' }, t), true) // Monday of the same week
  assert.equal(sipPaidThisCycle({ frequency: 'weekly', lastPaidDate: '2026-11-22' }, t), false) // Sunday before
  assert.equal(sipPaidThisCycle({ frequency: 'quarterly', lastPaidDate: '2026-10-01' }, t), true)
  assert.equal(sipPaidThisCycle({ frequency: 'quarterly', lastPaidDate: '2026-09-30' }, t), false)
  assert.equal(sipPaidThisCycle({ frequency: 'yearly', lastPaidDate: '2026-01-01' }, t), true)
})
