import test from 'node:test'
import assert from 'node:assert/strict'
import { navPatch } from './navPatch.js'

// A NAV refresh must change the price and what is derived from it, and nothing the user entered.
test('a NAV patch leaves units, invested amount, folio and history untouched', () => {
  const fund = { id: 'f1', name: 'X Fund', folio: '123', units: 100.5, invested: 10000, currentNav: 100, currentValue: 10050, navDate: '2026-11-20', sipAmount: 500 }
  const after = { ...fund, ...navPatch(fund, 110, '2026-11-24', 'market', { navFetchedAt: '2026-11-25T10:00:00.000Z' }, '2026-11-25') }
  assert.equal(after.currentNav, 110)
  assert.equal(after.prevNav, 100)
  assert.equal(after.navDate, '2026-11-24')
  assert.equal(after.currentValue, 11055)
  assert.equal(after.navFetchedAt, '2026-11-25T10:00:00.000Z')
  for (const k of ['units', 'invested', 'folio', 'name', 'sipAmount']) assert.equal(after[k], fund[k], k)
})
