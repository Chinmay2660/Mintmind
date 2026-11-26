import test from 'node:test'
import assert from 'node:assert/strict'
import { returnTotals, weightedRate } from './holdingsTotals.js'

test('returns ignore holdings with no recorded cost', () => {
  const t = returnTotals([{ value: 120, gain: 20 }, { value: 500, gain: null }])
  assert.equal(t.value, 620)
  assert.equal(t.gain, 20)
  assert.equal(Math.round(t.pct), 20) // 20 gained on 100 put in
})

test('with no costed holding there is no return to show', () => {
  assert.deepEqual(returnTotals([{ value: 500, gain: null }]), { value: 500, gain: null, pct: null })
  assert.deepEqual(returnTotals([]), { value: 0, gain: null, pct: null })
})

test('the loan rate is weighted by what is owed, and text amounts do not break it', () => {
  assert.equal(weightedRate([{ rate: 10, outstanding: 100 }, { rate: 20, outstanding: 300 }]), 17.5)
  assert.equal(weightedRate([{ rate: '10', outstanding: '100' }, { rate: 20, outstanding: '300' }]), 17.5)
})

test('no rate or nothing owed gives no average', () => {
  assert.equal(weightedRate([]), null)
  assert.equal(weightedRate([{ rate: 0, outstanding: 100 }, { rate: 9, outstanding: 0 }]), null)
})
