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
