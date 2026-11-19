import test from 'node:test'
import assert from 'node:assert/strict'
import { evalAmount, pressKey, displayExpr, hasOperator } from './amountExpr.js'

test('evaluates with operator precedence', () => {
  assert.equal(evalAmount('120+45.5*2'), 211)
  assert.equal(evalAmount('100/4-5'), 20)
  assert.equal(evalAmount('250'), 250)
  assert.equal(evalAmount('0.1+0.2'), 0.3)
})

test('rejects incomplete or invalid input', () => {
  assert.equal(evalAmount(''), null)
  assert.equal(evalAmount('12+'), null)
  assert.equal(evalAmount('5/0'), null)
  assert.equal(evalAmount('abc'), null)
  assert.equal(evalAmount('+5'), null)
})

test('key presses build a sensible expression', () => {
  let e = ''
  for (const k of ['0', '0', '5', '.', '5', '5', '5']) e = pressKey(e, k)
  assert.equal(e, '5.55') // no leading zeros, two decimals max
  e = pressKey(e, '+'); e = pressKey(e, '*')
  assert.equal(e, '5.55*') // operator replaced
  e = pressKey(e, '.')
  assert.equal(e, '5.55*0.')
  assert.equal(pressKey('', '+'), '')
  assert.equal(pressKey('12', 'back'), '1')
  assert.ok(hasOperator('1+2'))
})

test('display uses ₹-style grouping and typographic operators', () => {
  assert.equal(displayExpr('1250000*2'), '12,50,000×2')
  assert.equal(displayExpr('10-3/1'), '10−3÷1')
})
