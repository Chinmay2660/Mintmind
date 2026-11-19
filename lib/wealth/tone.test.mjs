import test from 'node:test'
import assert from 'node:assert/strict'
import { metricTone } from './tone.js'

test('a negative return is bad, with a minus sign and a down direction', () => {
  assert.deepEqual(metricTone({ amount: -1200, pct: -4.2 }), { state: 'bad', dir: -1, sign: '-' })
  assert.deepEqual(metricTone({ pct: -0.5 }), { state: 'bad', dir: -1, sign: '-' })
})
test('a positive return is good', () => {
  assert.equal(metricTone({ amount: 500 }).state, 'good')
})
test('tiny values are flat and zero has no sign', () => {
  assert.deepEqual(metricTone({ amount: 0 }), { state: 'flat', dir: 0, sign: '' })
  assert.equal(metricTone({ amount: 0.4 }).state, 'flat')
  assert.equal(metricTone({ pct: 0.004 }).state, 'flat')
})
test('invertGood flips the colour but not the sign', () => {
  assert.deepEqual(metricTone({ amount: -300, invertGood: true }), { state: 'good', dir: -1, sign: '-' })
  assert.equal(metricTone({ amount: 300, invertGood: true }).state, 'bad')
})
test('missing or NaN is none', () => {
  assert.equal(metricTone({}).state, 'none')
  assert.equal(metricTone({ amount: NaN }).state, 'none')
  assert.equal(metricTone({ amount: null, pct: null }).state, 'none')
})
