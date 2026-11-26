import test from 'node:test'
import assert from 'node:assert/strict'
import { assetFacts, depositGroups, portfolioOverview } from './portfolio.js'

const today = new Date(2026, 10, 19)
const fd1 = { id: 'f1', category: 'fd', name: 'HDFC FD', principal: 100000, ratePct: 7, startDate: '2025-11-19', maturityDate: '2027-11-19' }
const fd2 = { id: 'f2', category: 'fd', name: 'SBI FD', principal: 50000, ratePct: 6.5, startDate: '2024-01-01', maturityDate: '2025-01-01' }
const fd3 = { id: 'f3', category: 'fd', name: 'Early FD', principal: 20000, ratePct: 7, startDate: '2026-01-01', maturityDate: '2026-12-31' }
const rd = { id: 'r1', category: 'rd', name: 'RD', monthlyInstalment: 5000, ratePct: 6.5, startDate: '2026-05-19', tenureMonths: 12 }
const epf = { id: 'e1', category: 'epf', name: 'EPF', employeeShare: 400000, employerShare: 300000, epsShare: 100000 }
const ppf = { id: 'p1', category: 'ppf', name: 'PPF', value: 500000, invested: 400000 }
const house = { id: 'h1', category: 'realEstate', name: 'Flat', value: 9000000 }

test('deposits split into running and matured, running ones by maturity', () => {
  const g = depositGroups([fd1, fd2, fd3], 'fd', today)
  assert.deepEqual(g.running.map((x) => x.a.id), ['f3', 'f1'])
  assert.deepEqual(g.matured.map((x) => x.a.id), ['f2'])
  assert.ok(g.interest > 0 && g.value > g.invested)
  assert.equal(g.invested, 170000)
  assert.ok(g.avgRate > 6.5 && g.avgRate < 7)
})
test('interest earned so far grows with time and is below the maturity value', () => {
  const x = depositGroups([fd1], 'fd', today).running[0]
  assert.ok(x.interest > 0 && x.interest < x.maturityValue - 100000)
  assert.ok(x.daysLeft === 365)
})
test('recurring deposits show instalments paid and interest', () => {
  const x = depositGroups([rd], 'rd', today).running[0]
  assert.equal(x.paid, 7) // May to November inclusive
  assert.equal(x.invested, 35000)
  assert.ok(x.interest > 0)
})
test('portfolio totals every investment class and leaves property out', () => {
  const p = portfolioOverview({ assets: [fd1, rd, epf, ppf, house], today })
  const by = Object.fromEntries(p.rows.map((r) => [r.key, r]))
  // EPF and PPF are separate classes, each with its own row
  assert.equal(by.epf.value, 800000)
  assert.equal(by.epf.count, 1)
  assert.equal(by.ppf.value, 500000)
  assert.equal(by.ppf.count, 1)
  assert.ok(p.total > 1300000 && p.total < 1300000 + 200000)
  assert.ok(!p.rows.some((r) => r.key === 'realEstate'))
  assert.equal(by.mutualFunds.count, 0)
  assert.ok(Math.abs(p.rows.reduce((s, r) => s + r.share, 0) - 100) < 0.6)
})
test('gain counts only holdings whose cost is known', () => {
  const p = portfolioOverview({ assets: [epf, ppf], today })
  assert.equal(p.invested, 400000)
  assert.equal(p.gain, 100000) // PPF only: EPF has no cost, so it is not counted as pure gain
})
test('facts show details that exist and leave out the rest', () => {
  const f = assetFacts(fd1, today)
  const labels = f.map((x) => x.label)
  for (const l of ['Amount deposited', 'Interest rate', 'Opened on', 'Matures on', 'Interest earned so far', 'Value at maturity', 'Time left']) assert.ok(labels.includes(l), l)
  assert.ok(!assetFacts({ category: 'epf', name: 'x' }, today).some((x) => x.label === 'Notes'))
  assert.ok(assetFacts(epf, today).some((x) => x.label === 'Total balance' && x.value.money === 800000))
})
