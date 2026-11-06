import test from 'node:test'
import assert from 'node:assert/strict'
import { detectColumns, parseStatementRows, groupByFund, positionFrom, toISODate, toNumber } from './statementImport.js'

test('dates and numbers in common statement formats', () => {
  assert.equal(toISODate('03-Apr-2025'), '2025-04-03')
  assert.equal(toISODate('03/04/2025'), '2025-04-03')
  assert.equal(toISODate('2025-04-03'), '2025-04-03')
  assert.equal(toISODate(45750), '2025-04-03')
  assert.equal(toISODate('nonsense'), null)
  assert.equal(toNumber('₹1,25,000.50'), 125000.5)
  assert.equal(toNumber('(500)'), -500)
})

const rows = [
  { 'Scheme Name': 'Alpha Flexi Cap - Direct', 'Folio No': '123/45', Date: '05-Jan-2025', 'Transaction Type': 'SIP Purchase', Amount: '10,000', Units: '100', NAV: '100' },
  { 'Scheme Name': 'Alpha Flexi Cap - Direct', 'Folio No': '123/45', Date: '05-Feb-2025', 'Transaction Type': 'SIP Purchase', Amount: '10,000', Units: '', NAV: '125' },
  { 'Scheme Name': 'Alpha Flexi Cap - Direct', 'Folio No': '123/45', Date: '01-Mar-2025', 'Transaction Type': 'Redemption', Amount: '9,000', Units: '60', NAV: '150' },
  { 'Scheme Name': 'Alpha Flexi Cap - Direct', 'Folio No': '123/45', Date: '01-Mar-2025', 'Transaction Type': 'Stamp Duty', Amount: '0.5', Units: '', NAV: '' },
  { 'Scheme Name': 'Bad', 'Folio No': '9', Date: 'x', 'Transaction Type': 'Purchase', Amount: '1', Units: '1', NAV: '1' },
]
test('parse: columns found, units derived, stamp duty skipped, bad rows reported', () => {
  assert.equal(detectColumns(Object.keys(rows[0])).units, 'Units')
  const r = parseStatementRows(rows)
  assert.equal(r.txns.length, 3)
  assert.equal(r.txns[1].units, 80)
  assert.deepEqual(r.txns.map((t) => t.type), ['sip', 'sip', 'redeem'])
  assert.equal(r.errors.length, 1)
})
test('missing key columns gives a clear error', () => {
  assert.match(parseStatementRows([{ foo: 1 }]).errors[0], /Could not find/)
})
test('position uses average cost on redemption', () => {
  const g = groupByFund(parseStatementRows(rows).txns)
  assert.equal(g.length, 1)
  const p = positionFrom(g[0].txns)
  assert.equal(p.units, 120) // 100 + 80 - 60
  assert.equal(p.invested, 13333.33) // 20000 less average cost (20000/180) on 60 units
})
