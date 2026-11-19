import test from 'node:test'
import assert from 'node:assert/strict'
import { byAccountType } from './accountTypes.js'

test('groups categories and drops empty groups', () => {
  const r = byAccountType({ bank: 100, mutualFunds: 200, fd: 100, epf: 100, other: 100, mystery: 0 })
  assert.deepEqual(r.map((x) => [x.key, x.value]), [['cash', 100], ['invest', 300], ['retire', 100], ['other', 100]])
  assert.ok(Math.abs(r.reduce((s, x) => s + x.pct, 0) - 100) < 0.5)
})

test('unknown categories count as other and empty input is empty', () => {
  assert.equal(byAccountType({ crypto: 50 })[0].key, 'other')
  assert.deepEqual(byAccountType({}), [])
})
