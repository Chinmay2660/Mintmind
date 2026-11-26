import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCas, parseDemat, parseNps, parseEpf, parseStatementText } from './pdfStatements.js'

const CAS = `
Consolidated Account Statement
HDFC Mutual Fund
Folio No: 12345678 / 90        PAN: ABCDE1234F      KYC: OK
G123-HDFC Flexi Cap Fund - Direct Plan - Growth (Advisor: DIRECT) ISIN: INF179K01XQ0(Non-Demat) Registrar : CAMS
Opening Unit Balance: 100.000
03-Apr-2024   Purchase   5,000.00   45.123   110.8500   145.123
05-May-2024   SIP Purchase - Instalment 2/12   1,000.00   8.123   123.1100   153.246
05-May-2024   *** Stamp Duty ***   0.05
15-Jun-2024   Redemption   (2,500.00)   (20.000)   125.0000   133.246
Closing Unit Balance: 133.246   NAV on 28-Jun-2024: INR 130.2000   Total Cost Value: 10,000.00   Market Value on 28-Jun-2024: INR 17,349.00
SBI Mutual Fund
Folio No: 998877
SBI Small Cap Fund - Direct Plan - Growth ISIN: INF200K01VT7(Non-Demat) Registrar : CAMS
10-Jan-2025   Purchase   10,000.00   65.000   153.8461
`

test('CAS: purchases, SIPs and redemptions with folio, fund house and closing NAV', () => {
  const r = parseCas(CAS)
  assert.equal(r.txns.length, 4)
  const [a, b, c, d] = r.txns
  assert.equal(a.name, 'HDFC Flexi Cap Fund - Direct Plan - Growth')
  assert.equal(a.folio, '12345678/90')
  assert.equal(a.fundHouse, 'HDFC Mutual Fund')
  assert.equal(a.isin, 'INF179K01XQ0')
  assert.deepEqual([a.date, a.type, a.amount, a.units, a.nav], ['2024-04-03', 'lumpsum', 5000, 45.123, 110.85])
  assert.equal(b.type, 'sip')
  assert.deepEqual([c.type, c.amount, c.units], ['redeem', 2500, 20])
  assert.equal(d.folio, '998877')
  assert.equal(d.fundHouse, 'SBI Mutual Fund')
  assert.equal(d.nav, 153.8461)
  const k = r.closing['12345678/90|HDFC Flexi Cap Fund - Direct Plan - Growth']
  assert.deepEqual([k.units, k.nav, k.date], [133.246, 130.2, '2024-06-28'])
})

test('CAS: stamp duty rows and unrelated lines are ignored', () => {
  assert.equal(parseCas('05-May-2024   *** Stamp Duty ***   0.05').txns.length, 0)
  assert.equal(parseCas('nothing useful here').txns.length, 0)
})

const DEMAT = `
Holdings as on 31-Mar-2025
INE002A01018   RELIANCE INDUSTRIES LIMITED   10   2,450.00   24,500.00
INE467B01029   TATA CONSULTANCY SERVICES LTD   5   3,900.50   19,502.50
INF179K01XQ0   HDFC FLEXI CAP FUND - DIRECT GROWTH   150.123   120.5   18,090.00
Total   62,092.50
`

test('Demat: equity rows give units x price = value; fund units are counted but skipped', () => {
  const r = parseDemat(DEMAT)
  assert.equal(r.holdings.length, 2)
  assert.deepEqual([r.holdings[0].name, r.holdings[0].units, r.holdings[0].price, r.holdings[0].value], ['RELIANCE INDUSTRIES LIMITED', 10, 2450, 24500])
  assert.equal(r.holdings[1].value, 19502.5)
  assert.equal(r.mfUnitsSkipped, 1)
})

test('NPS: closing value per tier with the statement date', () => {
  const r = parseNps(`Statement of Transactions\nTier I Account\nStatement as on 31-Mar-2025\nTotal Value (INR)  5,43,210.45\nTier II Account\nClosing Balance  ₹ 25,000.00`)
  assert.equal(r.accounts.length, 2)
  assert.deepEqual([r.accounts[0].name, r.accounts[0].value, r.accounts[0].asOf], ['NPS Tier I', 543210.45, '2025-03-31'])
  assert.deepEqual([r.accounts[1].name, r.accounts[1].value], ['NPS Tier II', 25000])
})

test('EPF: employee + employer is the balance; pension is reported separately', () => {
  const r = parseEpf(`Member Id : MHBAN00123450000012345\nClosing Balance as on 31/03/2025   2,10,000   1,15,000   45,000`)
  assert.equal(r.accounts.length, 1)
  assert.equal(r.accounts[0].value, 325000)
  assert.equal(r.accounts[0].pension, 45000)
  assert.equal(r.accounts[0].name, 'EPF (MHBAN00123450000012345)')
  assert.equal(r.accounts[0].asOf, '2025-03-31')
})

test('one combined file can hold several kinds', () => {
  const r = parseStatementText(CAS + DEMAT)
  assert.deepEqual(r.found, ['mutual fund transactions', 'stock holdings'])
})

test('unrecognised text finds nothing', () => {
  assert.deepEqual(parseStatementText('Dear customer, your account is in good standing.').found, [])
})

// the text of a real EPFO member passbook (one financial year), as read from the PDF, with the personal details left out
const EPFO_2026 = [
  'Establishment ID/Name   PUPUN2060230000 / N/A', 'Member ID/Name   PUPUN20602300000011476 / A MEMBER',
  'EPF Passbook [ Financial Year - 2026-2027 ]', 'Particulars   Employee   Employer   Pension', 'OB Int. Updated upto 31/03/2026   84,674   28,907   4,625',
  'Cont. for the Due-Month', 'Mar-2026 01-04-2026   CR   21,000   15,000   2,520   1,270   1,250', '202604',
  'Total Contributions for the year [ 2026 ]   19,680   8,014   11,666', 'Total Transfer-Ins/VDRs for the year [ 2026 ]   0   0   0',
  'Total Withdrawals for the year [ 2026 ]   0   0   0', 'Int. Updated upto 31/03/2027   0   0   0', 'Closing Balance as on 31/03/2027   1,04,354   36,921   16,291',
  'End Of Statement   Printed On : 26-11-2026 22:57:20',
].join(String.fromCharCode(10))

test('EPF passbook from the EPFO portal: balances by share, the year contributed, dated by the print date', () => {
  const r = parseEpf(EPFO_2026)
  assert.equal(r.accounts.length, 1)
  const a = r.accounts[0]
  assert.equal(a.memberId, 'PUPUN20602300000011476')
  assert.deepEqual([a.employee, a.employer, a.pension], [104354, 36921, 16291])
  assert.deepEqual([a.value, a.total], [141275, 157566]) // EPF is your share plus the employer share; the total adds the pension
  assert.equal(a.contributedYear, 39360)
  assert.equal(a.fy, '2026-27')
  assert.equal(a.interest, null) // 0 credited so far this year
  assert.equal(a.asOf, '2026-11-26') // not 31 March 2027, which is a date that has not come
})
test('a passbook with no closing balance is worked out from the opening balance and the totals; it is not read as NPS', () => {
  const noClose = EPFO_2026.split(String.fromCharCode(10)).filter((l) => !/^Closing/.test(l)).join(String.fromCharCode(10))
  const r = parseStatementText(noClose)
  assert.equal(r.epf[0].employee, 104354)
  assert.equal(r.nps.length, 0)
})
