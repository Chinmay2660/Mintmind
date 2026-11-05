import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFacts } from './facts.js'
import { buildInsights, visibleInsights, widgetPicks } from './insights.js'
import { healthScore } from './health.js'
import { suggestCategory, learnCorrection, findDuplicates, detectRecurring, unusualSpending, suggestBudgetAdjustments, merchantKey } from './budgetAI.js'
import { sampleData, TODAY } from './fixture.mjs'

const facts = buildFacts(sampleData(), TODAY)
const CATS = ['Food', 'Shopping', 'Travel', 'Entertainment', 'Groceries', 'Bills', 'Healthcare', 'Other']

test('insights are specific, dated and dismissible without repeating', () => {
  const ins = buildInsights(facts)
  const pace = ins.find((i) => i.key === 'budget-pace')
  assert.match(pace.text, /47% of your June 2026 budget|46\.67%|spent/)
  assert.match(pace.text, /₹4,000 faster/)
  assert.ok(ins.find((i) => i.key === 'budget-forecast').kind === 'estimate')
  assert.ok(ins.every((i) => i.period && i.id.includes('@')))
  const hidden = visibleInsights(ins, { [pace.id]: 1 })
  assert.ok(!hidden.some((i) => i.id === pace.id))
  assert.equal(visibleInsights([...ins, ...ins]).length, ins.length) // no duplicates
  assert.ok(!ins.some((i) => i.key === 'card-util')) // 40% overall utilisation is below the 70% threshold
})

test('widget picks one of each', () => {
  const w = widgetPicks(facts, visibleInsights(buildInsights(facts)))
  assert.ok(w.money && w.spending && w.reminder && w.action)
})

test('health score is rule based, explained and bounded', () => {
  const h = healthScore(facts, { monthlyIncome: 100000 })
  assert.ok(h.score >= 0 && h.score <= 100)
  assert.ok(h.params.every((p) => p.rule && p.weight))
  assert.ok(h.disclaimer.includes('not a credit score'))
  assert.ok(h.params.find((p) => p.key === 'budget').score < 100)
})

test('categorisation suggests from merchants and learns corrections', () => {
  assert.equal(suggestCategory('Swiggy order', CATS).category, 'Food')
  assert.equal(suggestCategory('Netflix', CATS).subscription, true)
  assert.equal(suggestCategory('Amazon', CATS).category, 'Shopping')
  assert.equal(suggestCategory('Some local shop', CATS), null)
  assert.equal(suggestCategory('Swiggy', ['Eating out', 'Other']), null) // never invents a category
  const rules = learnCorrection({}, 'Swiggy Instamart', 'Groceries')
  assert.equal(suggestCategory('Instamart groceries', CATS, rules).category, 'Groceries')
  assert.equal(merchantKey('UPI-ZOMATO-123'), 'zomato')
})

test('duplicates and recurring expenses', () => {
  const ex = [{ id: 'a', date: '2026-06-02', amount: 450, category: 'Food', note: 'Swiggy' }]
  assert.equal(findDuplicates({ date: '2026-06-03', amount: 450, category: 'Food', note: 'swiggy' }, ex).length, 1)
  assert.equal(findDuplicates({ date: '2026-06-09', amount: 450, category: 'Food', note: 'swiggy' }, ex).length, 0)
  const rec = detectRecurring([1, 2, 3, 4].map((m) => ({ id: `n${m}`, date: `2026-0${m}-05`, amount: 649, category: 'Entertainment', note: 'Netflix' })))
  assert.equal(rec[0].merchant, 'netflix')
  assert.equal(rec[0].likelySubscription, true)
  assert.equal(detectRecurring([{ id: '1', date: '2026-01-05', amount: 649, category: 'E', note: 'Netflix' }]).length, 0)
})

test('unusual spending and budget adjustments are suggestions with reasons', () => {
  const adj = suggestBudgetAdjustments(facts)
  assert.ok(adj.every((a) => a.reason))
  const un = unusualSpending(facts, sampleData().expenses)
  assert.ok(Array.isArray(un))
})
