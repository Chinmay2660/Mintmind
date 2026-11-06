import test from 'node:test'
import assert from 'node:assert/strict'
import { isoDate, nameKey, parseAmfi, parseKiteMfCsv, parseKiteLtp, matchFund } from './parsers.js'

const AMFI = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date

Open Ended Schemes(Equity Scheme - Flexi Cap Fund)
Alpha Mutual Fund
122639;INF879O01027;-;Alpha Flexi Cap Fund - Direct Plan - Growth;81.2345;05-Nov-2026
100001;INF000000001;INF000000002;Beta Bond Fund - Regular Plan - Growth Option;N.A.;05-Nov-2026
`
test('dates and names', () => {
  assert.equal(isoDate('05-Nov-2026'), '2026-11-05')
  assert.equal(isoDate('2026-11-05 00:00'), '2026-11-05')
  assert.equal(isoDate('x'), null)
  assert.equal(nameKey('Alpha Flexi Cap Fund - Direct Plan - Growth'), nameKey('Alpha Flexi Cap Fund - Direct Growth'))
})
test('AMFI file: headings, blank lines and N.A. rows are skipped', () => {
  const r = parseAmfi(AMFI)
  assert.equal(r.length, 1)
  assert.deepEqual([r[0].schemeCode, r[0].price, r[0].priceDate, r[0].isins], ['122639', 81.2345, '2026-11-05', ['INF879O01027']])
})
test('Kite MF CSV and LTP', () => {
  const csv = 'tradingsymbol,amc,name,last_price,last_price_date\nINF879O01027,Alpha,"Alpha Flexi Cap Fund, Direct - Growth",81.5,2026-11-04\nBAD,x,y,0,2026-11-04\n'
  const r = parseKiteMfCsv(csv)
  assert.equal(r.length, 1); assert.equal(r[0].name, 'Alpha Flexi Cap Fund, Direct - Growth'); assert.equal(r[0].priceDate, '2026-11-04')
  assert.deepEqual(parseKiteLtp({ 'NSE:INFY': { last_price: 1500 }, 'NSE:X': {} }).map((x) => [x.symbol, x.price]), [['NSE:INFY', 1500]])
})
test('matching prefers ids, never guesses ambiguous names', () => {
  const rows = [{ isins: ['INF1'], nameKey: 'a', price: 1 }, { isins: [], schemeCode: '7', nameKey: 'b', price: 2 }, { isins: [], nameKey: 'dup', price: 3 }, { isins: [], nameKey: 'dup', price: 4 }]
  assert.equal(matchFund({ isin: 'INF1', name: 'zzz' }, rows).price, 1)
  assert.equal(matchFund({ schemeCode: 7 }, rows).price, 2)
  assert.equal(matchFund({ name: 'b' }, rows).price, 2)
  assert.equal(matchFund({ name: 'dup' }, rows), null)
  assert.equal(matchFund({ name: 'nothing' }, rows), null)
})
