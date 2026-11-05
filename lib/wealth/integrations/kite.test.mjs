import test from 'node:test'
import assert from 'node:assert/strict'
import { matchFund, planKiteSync } from './kite.js'

const funds = [
  { id: 'a', name: 'Parag Parikh Flexi Cap Fund - Direct Growth', folio: '12345678/91', units: 100, currentNav: 70, navDate: '2025-01-01' },
  { id: 'b', name: 'HDFC Index Fund - Nifty 50 Plan - Direct', folio: '88776655/12', units: 50, currentNav: 190 },
]
const payload = {
  mutualFunds: [
    { folio: '12345678/91', name: 'Parag Parikh Flexi Cap Fund - Direct Plan', symbol: 'INF879O01027', units: 100, averageNav: 50, nav: 80, navDate: '2025-02-03' },
    { folio: '88776655/12', name: 'HDFC Index Nifty 50', symbol: 'INF179K01XQ0', units: 60, averageNav: 150, nav: 195, navDate: '2025-02-03' },
    { folio: '999', name: 'Quant Small Cap Fund Direct', symbol: 'INF966L01689', units: 10, averageNav: 200, nav: 210, navDate: '2025-02-03' },
  ],
  sips: [{ id: 's1', symbol: 'INF879O01027', name: 'Parag', status: 'active', frequency: 'monthly', amount: 5000, instalments: -1, completed: 12, day: 5, created: '2024-01-05' }],
  equity: { count: 14, value: 1250000, invested: 1000000, dayChange: 5200 },
  errors: {},
}

test('matches by folio+name, plans NAV updates and flags new funds', () => {
  const p = planKiteSync({ funds, sips: [], assets: [{ id: 'st', category: 'stocks', value: 1000000 }] }, payload)
  assert.equal(p.navUpdates.length, 2)
  assert.equal(p.navUpdates[0].newNav, 80)
  assert.equal(p.navUpdates[0].newValue, 8000) // existing units x Kite NAV, units never overwritten
  assert.deepEqual(p.navUpdates[1].unitsMismatch, { mine: 50, kite: 60 })
  assert.equal(p.newFunds.length, 1)
  assert.equal(p.newFunds[0].symbol, 'INF966L01689')
})

test('SIPs link to matched fund; equity replaces the manual stocks entry (no double count)', () => {
  const p = planKiteSync({ funds, sips: [], assets: [{ id: 'st', category: 'stocks', value: 1000000 }] }, payload)
  assert.equal(p.newSips.length, 1)
  assert.equal(p.newSips[0].fundId, 'a')
  assert.equal(p.newSips[0].instalmentsTotal, 0) // -1 (open-ended) -> 0
  assert.equal(p.equity.assetId, 'st')
  assert.equal(p.equity.replacesManual, true)
})

test('second sync with no changes reports nothing to update', () => {
  const synced = funds.map((f, i) => ({ ...f, kiteSymbol: payload.mutualFunds[i].symbol, currentNav: payload.mutualFunds[i].nav, navDate: payload.mutualFunds[i].navDate }))
  const p = planKiteSync({ funds: synced, sips: [{ id: 'x', kiteSipId: 's1', fundId: 'a', amount: 5000, frequency: 'monthly', status: 'active', instalmentsCompleted: 12 }], assets: [{ id: 'k', source: 'kite', category: 'stocks', value: 1 }] }, payload)
  assert.equal(p.navUpdates.length, 0)
  assert.equal(p.unchanged.length, 2)
  assert.equal(p.sipUpdates.length, 0)
  assert.equal(p.equity.replacesManual, false)
})

test('does not match unrelated funds sharing no folio or name', () => {
  assert.equal(matchFund(funds, { folio: '1', name: 'Totally Different Fund', symbol: 'X' }, []), null)
})
