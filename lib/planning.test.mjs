import test from 'node:test'
import assert from 'node:assert/strict'
import { projectPlan, moneyCheckup } from './planning.js'

const base = { netWorth: 1500000, monthlySave: 40000 }
test('no events: net worth grows; a raise adds to it, a child subtracts', () => {
  const b = projectPlan(base)
  assert.ok(b.endNetWorth > base.netWorth && b.points.length === 26)
  assert.ok(projectPlan({ ...base, events: [{ type: 'raise', amount: 20000 }] }).endNetWorth > b.endNetWorth)
  assert.ok(projectPlan({ ...base, events: [{ type: 'child', amount: 30000 }] }).endNetWorth < b.endNetWorth)
})
test('events stack and reduce monthly room', () => {
  const p = projectPlan({ ...base, events: [{ type: 'car', amount: 1000000 }, { type: 'loan', amount: 500000 }] })
  assert.ok(p.monthlyRoom < base.monthlySave)
  assert.ok(p.points[0] === base.netWorth - 1000000)
})
test('check-up: gating and statuses', () => {
  const ok = { takeHome: 100000, spend: 50000, essentials: 40000, liquid: 400000, loans: [], termCover: 12000000, healthCover: 1000000, age: 30, retireAge: 60, monthlyInvest: 15000, retirementSavings: 10000000 }
  const r = moneyCheckup(ok)
  assert.equal(r.counts.fix, 0)
  const weak = moneyCheckup({ ...ok, liquid: 20000, loans: [{ balance: 40000, ratePct: 42, emi: 10000 }] })
  assert.ok(weak.counts.fix >= 2)
  assert.equal(weak.groups.find((g) => g.id === 'grow').checks[0].status, 'hold')
})

import { earliestRetirementAge } from './planning.js'

test('a change can happen later: nothing changes before it, and a cost lowers net worth after', () => {
  const b = projectPlan(base)
  const later = projectPlan({ ...base, events: [{ type: 'marriage', amount: 1500000, at: 3 }] })
  assert.equal(later.points[2], b.points[2])
  assert.ok(Math.abs(later.points[3] - (b.points[3] - 1500000)) < 1)
  assert.ok(later.endNetWorth < b.endNetWorth)
})
test('a later loan costs nothing until it starts', () => {
  const b = projectPlan(base)
  const p = projectPlan({ ...base, events: [{ type: 'loan', amount: 800000, at: 4 }] })
  assert.equal(p.points[4], b.points[4])
  assert.ok(p.points[5] < b.points[5])
})
test('custom and marriage are one-off costs today when at is 0', () => {
  assert.equal(projectPlan({ ...base, events: [{ type: 'custom', amount: 500000 }] }).points[0], base.netWorth - 500000)
})
test('earliest retirement age moves later when spending goes up, and is null when never reached', () => {
  const p = projectPlan({ netWorth: 5000000, monthlySave: 60000 })
  const a = earliestRetirementAge({ points: p.points, age: 34, monthlyExpense: 60000 })
  const b = earliestRetirementAge({ points: p.points, age: 34, monthlyExpense: 120000 })
  assert.ok(a != null && (b == null || b > a))
  assert.equal(earliestRetirementAge({ points: [1, 2, 3], age: 34, monthlyExpense: 100000 }), null)
  assert.equal(earliestRetirementAge({ points: p.points, age: 0, monthlyExpense: 1 }), null)
})

import { healthScore, applyPlanToCheckup } from './planning.js'
const sound = { takeHome: 100000, spend: 50000, essentials: 40000, liquid: 400000, loans: [], termCover: 12000000, healthCover: 1000000, age: 30, retireAge: 60, monthlyInvest: 15000, retirementSavings: 10000000 }

test('score is 0 to 100, higher when the basics are covered', () => {
  const good = healthScore(moneyCheckup(sound))
  assert.ok(good.score >= 80 && good.label === 'Strong')
  const poor = healthScore(moneyCheckup({ ...sound, liquid: 10000, termCover: 0, healthCover: 0, loans: [{ emi: 30000, ratePct: 24, balance: 300000 }] }))
  assert.ok(poor.score <= 60 && poor.score < good.score)
  assert.equal(good.groups.length, 5)
})
test('checks on hold are left out, and no data gives no score', () => {
  const r = moneyCheckup({ ...sound, healthCover: 0 }) // a missing basic puts growth and retirement on hold
  const hs = healthScore(r)
  assert.equal(hs.groups.find((g) => g.id === 'grow').score, null)
  assert.ok(hs.score != null)
  assert.equal(healthScore({ groups: [{ id: 'x', name: 'x', checks: [{ status: 'hold' }] }] }).score, null)
})
test('planned changes move the inputs the right way', () => {
  const after = applyPlanToCheckup(sound, [{ type: 'home', amount: 7500000 }, { type: 'marriage', amount: 1500000 }, { type: 'raise', amount: 20000 }])
  assert.equal(after.loans.length, 1)
  assert.ok(after.loans[0].emi > 50000)
  assert.equal(after.liquid, 0) // 400000 minus a 1.5 million wedding and a down payment cannot go below zero
  assert.equal(after.takeHome, 120000)
  assert.deepEqual(sound.loans, []) // the original is left alone
})
test('a big loan and a wedding lower the score', () => {
  const before = healthScore(moneyCheckup(sound)).score
  const after = healthScore(moneyCheckup(applyPlanToCheckup(sound, [{ type: 'loan', amount: 3000000 }, { type: 'marriage', amount: 1500000 }]))).score
  assert.ok(after < before)
})
