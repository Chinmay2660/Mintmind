import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesAll, normalize } from './search.js'

test('every word has to appear, in any order and any case', () => {
  assert.ok(matchesAll('hdfc savings', 'Primary Savings', 'HDFC Bank'))
  assert.ok(matchesAll('SAVINGS  hdfc', 'Primary Savings', 'HDFC Bank'))
  assert.ok(!matchesAll('hdfc current', 'Primary Savings', 'HDFC Bank'))
})
test('amounts match with or without commas and the rupee sign', () => {
  assert.ok(matchesAll('1500', 'Groceries', 1500))
  assert.ok(matchesAll('₹1,500', 'Groceries', 1500))
  assert.ok(matchesAll('1,500 groceries', 'Groceries', '1500'))
})
test('an empty query matches everything and missing fields do not break it', () => {
  assert.ok(matchesAll('', 'anything'))
  assert.ok(matchesAll('  ', null))
  assert.ok(matchesAll('a', undefined, 'a'))
  assert.equal(normalize(null), '')
})
