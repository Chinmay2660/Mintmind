import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFacts } from './facts.js'
import { sampleData, TODAY } from './fixture.mjs'

const f = buildFacts(sampleData(), TODAY)

test('net worth facts come from the calculation engine', () => {
  assert.equal(f.netWorth.current, 3880000)
})

test('net worth totals and comparisons', () => {
  assert.equal(f.netWorth.assets, 410000 + 850000 + 4500000)
  assert.equal(f.netWorth.liabilities, 1800000 + 80000)
  assert.equal(f.netWorth.vsLastMonth.baseDate, '2026-05-10')
  assert.equal(f.netWorth.vsLastMonth.diff, f.netWorth.current - 5000000)
  assert.equal(f.netWorth.contributors[0].key, 'mutualFunds') // +50,000 vs bank +30,000 since the 10 May snapshot
})

test('budget: allowance today is pace-based, not remaining / days', () => {
  const b = f.budget
  assert.equal(b.days, 30)
  assert.equal(b.dailyBudget, 1000)
  assert.equal(b.expectedTillToday, 10000)
  assert.equal(b.spent, 14000)
  assert.equal(b.variance, 4000)
  assert.equal(b.projected, 42000)
  assert.equal(b.projectedOver, 12000)
  assert.equal(b.remaining, 16000)
  assert.equal(b.allowanceToday, 0) // already ahead of pace: nothing "on pace" left today
  assert.equal(b.safeDailySpend, 800) // remaining 16000 / 20 days left (a different number on purpose)
  assert.equal(b.categories.find((c) => c.name === 'Food').changeVsPrevPct, 50)
})

test('mutual funds: month change split into contributions and market movement', () => {
  assert.equal(f.funds.summary.invested, 700000)
  assert.equal(f.funds.largest.name, 'Alpha Flexi Cap Fund')
  assert.equal(f.funds.monthChange.valueChange, 850000 - 800000)
  assert.equal(f.funds.monthChange.contributions, 10000)
  assert.equal(f.funds.monthChange.marketMovement, 40000)
  assert.equal(f.funds.sipContributionChange, 5000)
  assert.equal(f.funds.worst.name, 'Beta Index Fund')
})

test('cards, insurance and gaps', () => {
  assert.equal(f.cards.utilisationPct, 40)
  assert.equal(f.cards.perCard[0].name, 'HDFC Regalia')
  assert.equal(f.cards.nextDue.daysLeft, 3)
  assert.equal(f.insurance.healthCover, 1000000)
  assert.equal(f.insurance.upcomingPremiums[0].daysLeft, 7)
  assert.deepEqual(f.insurance.coveredMembers.sort(), ['Arjun', 'Priya'])
  assert.ok(f.gaps.some((g) => /family/i.test(g)))
})
