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

test('new templates: subscriptions, deposits, goals and the review inbox', () => {
  const now = new Date(2026, 4, 10) // 10 May 2026
  const ev = (id, d, params = {}) => TEMPLATES[id].evaluate(null, { ...Object.fromEntries(Object.entries(TEMPLATES[id].params).map(([k, v]) => [k, v.default])), ...params }, d, now)
  const sub = { meta: [{ key: 'subscriptions', value: [{ id: 's', name: 'Netflix', amount: 649, frequency: 'monthly', startDate: '2026-01-12' }] }] }
  assert.equal(ev('sub-due', sub).fired, true) // 12 May is 2 days away
  assert.match(ev('sub-due', sub).body, /Netflix ₹649 on 2026-05-12/)
  assert.equal(ev('sub-due', sub, { days: 1 }).fired, false)
  assert.equal(ev('sub-due', { meta: [] }).fired, false)

  const fd = { assets: [{ id: 'f', category: 'fd', name: 'HDFC FD', principal: 100000, ratePct: 7, startDate: '2025-06-01', maturityDate: '2026-05-25' }] }
  assert.equal(ev('fd-maturity', fd).fired, true) // 15 days
  assert.equal(ev('fd-maturity', fd, { days: 10 }).fired, false)
  assert.equal(ev('fd-maturity', { assets: [{ ...fd.assets[0], maturityDate: '2026-04-01' }] }).fired, false) // already matured

  const rd = { assets: [{ id: 'r', category: 'rd', name: 'Post office RD', monthlyInstalment: 5000, startDate: '2026-01-11' }] }
  assert.equal(ev('rd-instalment', rd).fired, true) // the 11th is tomorrow
  assert.equal(ev('rd-instalment', { assets: [{ ...rd.assets[0], startDate: '2026-01-25' }] }).fired, false)

  assert.equal(ev('review-pending', { expenses: [{ needsReview: true }], bankTxns: [{ needsReview: true }, {}] }).fired, true)
  assert.match(ev('review-pending', { expenses: [{ needsReview: true }, { needsReview: true }], bankTxns: [] }).body, /2 imported entries are waiting/)
  assert.equal(ev('review-pending', { expenses: [{}], bankTxns: [] }).fired, false)
})

test('goal deadline: fires for a goal that is short and near its date, not for one that is met or far away', () => {
  const now = new Date(2026, 4, 10)
  const base = { assets: [{ id: 'a', category: 'other', value: 40000 }], bankAccounts: [], funds: [], fundTxns: [] }
  const goal = (over) => ({ id: 'g', name: 'Trip', target: 100000, targetDate: '2026-07-10', links: [{ type: 'asset', id: 'a', pct: 100 }], ...over })
  const ev = (g) => TEMPLATES['goal-deadline'].evaluate(null, { months: 3 }, { ...base, goals: [g] }, now)
  const r = ev(goal({}))
  assert.equal(r.fired, true)
  assert.match(r.body, /Trip is 40% there with ₹60,000 to go/)
  assert.equal(ev(goal({ target: 30000 })).fired, false) // already reached
  assert.equal(ev(goal({ targetDate: '2028-01-01' })).fired, false) // far away
})
