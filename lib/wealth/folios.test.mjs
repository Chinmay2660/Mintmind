import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeFolios, sameFund } from './folios.js'

const a = { id: 'a', name: 'Axis Fund', schemeCode: '1', folio: 'F1', units: 100, invested: 10000, purchaseNav: 100, currentNav: 120, currentValue: 12000 }
const b = { id: 'b', name: 'Axis Fund', schemeCode: '1', folio: 'F2', units: 50, invested: 7500, purchaseNav: 150, currentNav: 120, currentValue: 6000 }
const txns = [{ id: 't1', fundId: 'a', date: '2025-01-01', type: 'lumpsum', amount: 10000, nav: 100, units: 100 }, { id: 't2', fundId: 'b', date: '2025-06-01', type: 'lumpsum', amount: 7500, nav: 150, units: 50 }]

test('folios of one fund are added together, each keeping its own figures', () => {
  const { f, m } = mergeFolios([a, b], txns, new Date(2026, 0, 1))
  assert.equal(f.units, 150)
  assert.equal(m.invested, 17500)
  assert.equal(m.value, 18000)
  assert.equal(a.units, 100) // the folio records themselves are untouched
})
test('sameFund matches by scheme code, or by name when there is none', () => {
  assert.equal(sameFund(a, b), true)
  assert.equal(sameFund(a, { ...b, schemeCode: '2' }), false)
  assert.equal(sameFund({ name: 'X Fund' }, { name: ' x fund ' }), true)
})
