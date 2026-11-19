import test from 'node:test'
import assert from 'node:assert/strict'
import { netWorthEvents } from './nwEvents.js'

const snap = (id, assets, liabilities, assetBreakdown, liabilityBreakdown, note) => ({ id, date: `${id}-28`, assets, liabilities, netWorth: assets - liabilities, assetBreakdown, liabilityBreakdown, ...(note ? { note } : {}) })

const series = [
  snap('2025-10', 8000000, 1000000, { bank: 1000000, mutualFunds: 7000000 }, { homeLoan: 1000000 }),
  snap('2026-01', 8500000, 1000000, { bank: 1000000, mutualFunds: 7500000 }, { homeLoan: 1000000 }),
  snap('2026-06', 8600000, 1700000, { bank: 1000000, mutualFunds: 7600000 }, { homeLoan: 1000000, carLoan: 700000 }, 'bought the car'),
  snap('2026-08', 8600000, 1400000, { bank: 1000000, mutualFunds: 7600000 }, { homeLoan: 700000, carLoan: 700000 }),
]

test('the first month is the start', () => {
  const e = netWorthEvents(series)
  assert.equal(e[0].kind, 'start')
  assert.equal(e[0].ym, '2025-10')
  assert.equal(e[0].nwDelta, null)
})
test('a new loan and a paydown are found, with the net worth change that month', () => {
  const e = netWorthEvents(series)
  const added = e.find((x) => x.kind === 'debt-new')
  assert.equal(added.text, 'Added car loan ₹7 L')
  assert.equal(added.nwDelta, 100000 - 700000)
  const down = e.find((x) => x.kind === 'debt-down')
  assert.equal(down.text, 'Paid down home loan by ₹3 L')
  assert.equal(down.nwDelta, 300000)
})
test('a note becomes a marker, and a loan that disappears is cleared', () => {
  const e = netWorthEvents(series)
  assert.ok(e.some((x) => x.kind === 'note' && x.text === 'bought the car'))
  const cleared = netWorthEvents([series[0], snap('2026-02', 8000000, 0, { bank: 1000000, mutualFunds: 7000000 }, {})])
  assert.ok(cleared.some((x) => x.text === 'Cleared home loan'))
})
test('ordinary growth is not an event, and only the heaviest events are kept', () => {
  assert.ok(!netWorthEvents(series).some((x) => x.kind === 'asset-up'))
  assert.equal(netWorthEvents(series, { max: 2 }).length, 2)
  assert.deepEqual(netWorthEvents([]), [])
})
