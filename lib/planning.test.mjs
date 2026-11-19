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
