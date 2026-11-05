import test from 'node:test'
import assert from 'node:assert/strict'
import { familyTotals, visibleSummary } from './visibility.js'

test('only permitted fields are visible; emergency-only exposes nothing', () => {
  const s = { netWorth: 100, assets: 150, liabilities: 50, bank: 10, mutualFunds: 20 }
  assert.deepEqual(visibleSummary(s, { netWorth: true }), { netWorth: 100, assets: 150, liabilities: 50 })
  assert.equal(visibleSummary(s, {}), null)
  assert.equal(visibleSummary(s, { netWorth: true, emergencyOnly: true }), null)
  assert.equal(visibleSummary(s, { bank: true }).netWorth, undefined)
})

test('joint assets are counted once across members', () => {
  const t = familyTotals([
    { assets: 1000, liabilities: 100, joint: [{ key: 'acct-1', value: 200 }] },
    { assets: 500, liabilities: 0, joint: [{ key: 'acct-1', value: 200 }] },
  ])
  assert.equal(t.assets, 1300)
  assert.equal(t.netWorth, 1200)
  assert.equal(t.jointDeduplicated, 200)
})
