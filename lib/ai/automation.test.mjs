import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFacts } from './facts.js'
import { TEMPLATES, newRule, isDue, runDueRules, nextRunAfter } from './automation.js'
import { sampleData, TODAY } from './fixture.mjs'

const data = sampleData()
const facts = buildFacts(data, TODAY)

test('templates fire only when their condition holds', () => {
  const ev = (id, params = {}) => TEMPLATES[id].evaluate(facts, { ...Object.fromEntries(Object.entries(TEMPLATES[id].params).map(([k, v]) => [k, v.default])), ...params }, data, TODAY)
  assert.equal(ev('budget-pace').fired, true) // 14000 spent vs 10000 expected = 140% >= 80%
  assert.equal(ev('budget-pace', { threshold: 200 }).fired, false)
  assert.equal(ev('card-due').fired, true) // HDFC due in 3 days
  assert.equal(ev('card-due', { days: 1 }).fired, false)
  assert.equal(ev('card-util').fired, false) // 40% < 70%
  assert.equal(ev('ins-premium').fired, true)
  assert.equal(ev('ins-document').fired, true) // fixture policies have no documents
  assert.equal(ev('bank-threshold', { amount: 1 }).fired, false)
  assert.equal(ev('mf-nav').fired, false) // NAVs are 1 day old
  assert.equal(ev('mf-nav', { days: 0 }).fired, true)
  assert.equal(ev('family-report').fired, false)
  assert.match(ev('budget-daily').body, /spend about ₹0 today/)
})

test('scheduling: due, start/end dates, pause, next run', () => {
  const r = newRule('card-due', TODAY)
  assert.equal(isDue(r, TODAY), true)
  assert.equal(isDue({ ...r, enabled: false }, TODAY), false)
  assert.equal(isDue({ ...r, startDate: '2026-07-01' }, TODAY), false)
  assert.equal(isDue({ ...r, endDate: '2026-06-01' }, TODAY), false)
  assert.equal(nextRunAfter({ frequency: 'daily' }, TODAY), '2026-06-11')
  assert.equal(nextRunAfter({ frequency: 'weekly' }, TODAY), '2026-06-17')
  assert.equal(nextRunAfter({ frequency: 'monthly' }, TODAY), '2026-07-10')
})

test('running rules records history and moves next execution; failures are captured', () => {
  const rules = [newRule('card-due', TODAY), { ...newRule('budget-pace', TODAY), enabled: false }, { ...newRule('card-due', TODAY), templateId: 'nope' }]
  const { runs, rules: next } = runDueRules(rules, facts, data, TODAY)
  assert.equal(runs.length, 2)
  assert.equal(runs[0].status, 'success')
  assert.equal(runs[0].fired, true)
  assert.equal(runs[1].status, 'failed')
  assert.equal(next[0].nextRunAt, '2026-06-11')
  assert.equal(next[1].lastRunAt, null) // paused rule untouched
  assert.equal(runDueRules(next, facts, data, TODAY).runs.length, 0) // not due again the same day
})
