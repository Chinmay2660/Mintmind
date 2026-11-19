import test from 'node:test'
import assert from 'node:assert/strict'
import { matchRule, previewRules } from './rules.js'

const rules = [
  { id: 'r1', contains: 'swiggy', category: 'Food' },
  { id: 'r2', contains: 'uber ride', category: 'Travel' },
  { id: 'r3', contains: 'salary', category: 'Salary', kind: 'income' },
]

test('a rule matches when all of its words appear, in any order', () => {
  assert.equal(matchRule(rules, 'SWIGGY order 4421')?.id, 'r1')
  assert.equal(matchRule(rules, 'ride with Uber')?.id, 'r2')
  assert.equal(matchRule(rules, 'uber eats'), null) // "ride" is missing
})
test('rules are for their own kind and the first match wins', () => {
  assert.equal(matchRule(rules, 'Salary credit', 'expense'), null)
  assert.equal(matchRule(rules, 'Salary credit', 'income')?.id, 'r3')
  const both = [{ id: 'a', contains: 'amazon', category: 'Shopping' }, { id: 'b', contains: 'amazon prime', category: 'Entertainment' }]
  assert.equal(matchRule(both, 'Amazon Prime renewal')?.id, 'a')
})
test('empty text, empty rules and switched off rules never match', () => {
  assert.equal(matchRule(rules, ''), null)
  assert.equal(matchRule([], 'swiggy'), null)
  assert.equal(matchRule([{ id: 'x', contains: '', category: 'Food' }], 'swiggy'), null)
  assert.equal(matchRule([{ id: 'x', contains: 'swiggy', category: 'Food', enabled: false }], 'swiggy'), null)
})
test('running rules over past expenses only changes what differs, and can spare hand-set categories', () => {
  const past = [
    { id: 'e1', note: 'Swiggy dinner', category: 'Other' },
    { id: 'e2', note: 'Swiggy lunch', category: 'Food' },
    { id: 'e3', note: 'Swiggy Instamart', category: 'Groceries' },
    { id: 'e4', note: 'Metro card', category: 'Other' },
  ]
  assert.deepEqual(previewRules(rules, past).map((c) => c.id), ['e1', 'e3'])
  assert.deepEqual(previewRules(rules, past, { onlyOther: true }).map((c) => c.id), ['e1'])
})
