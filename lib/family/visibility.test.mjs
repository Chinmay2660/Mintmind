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

test('sharing preview shows exactly what the permissions allow and hides the rest', async () => {
  const { sharingPreview } = await import('./visibility.js')
  const summary = { netWorth: 100, assets: 150, liabilities: 50, growthPct: 2, bank: 40, mutualFunds: 60, insuranceCover: 900 }
  const rows = (perm) => Object.fromEntries(sharingPreview(summary, perm).map((r) => [r.key, r.visible]))
  const none = rows({})
  assert.ok(Object.values(none).every((v) => v === false))
  const nw = rows({ netWorth: true })
  assert.deepEqual([nw.netWorth, nw.assets, nw.liabilities, nw.growthPct, nw.bank, nw.mutualFunds], [true, true, true, true, false, false])
  const some = rows({ bank: true, insurance: true, documents: true })
  assert.deepEqual([some.bank, some.insuranceCover, some.documents, some.netWorth, some.mutualFunds], [true, true, true, false, false])
  // emergency-only hides everything, even if other boxes are ticked
  assert.ok(Object.values(rows({ netWorth: true, bank: true, documents: true, emergencyOnly: true })).every((v) => v === false))
  // a value that is shown carries the real figure
  assert.equal(sharingPreview(summary, { bank: true }).find((r) => r.key === 'bank').value, 40)
})

test('a personal setting for one person beats the circle-wide one, and only for that person', async () => {
  const { permissionsFor, visibleSummary } = await import('./visibility.js')
  const summary = { netWorth: 100, assets: 150, liabilities: 50, bank: 40 }
  const member = { permissions: { netWorth: true }, overrides: [{ viewerId: 'v2', permissions: { bank: true } }] }
  assert.deepEqual(permissionsFor(member, 'v1'), { netWorth: true }) // no personal setting: the default
  assert.deepEqual(permissionsFor(member, 'v2'), { bank: true }) // personal setting
  assert.deepEqual(visibleSummary(summary, permissionsFor(member, 'v1')), { netWorth: 100, assets: 150, liabilities: 50 })
  assert.deepEqual(visibleSummary(summary, permissionsFor(member, 'v2')), { bank: 40 })
  // the map form works too, and an empty override still wins (share nothing with this person)
  const m2 = { permissions: { netWorth: true }, overrides: { v3: {} } }
  assert.equal(visibleSummary(summary, permissionsFor(m2, 'v3')), null)
  assert.equal(permissionsFor({ permissions: { bank: true } }, 'x').bank, true)
})
