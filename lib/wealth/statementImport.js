// Mutual fund statement import (pure, tested). Reads rows from a CSV/Excel export of a transaction statement,
// finds the columns by their headings, and turns each row into a purchase / SIP / redemption.

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const ALIASES = {
  name: ['scheme', 'schemename', 'fund', 'fundname', 'schemedescription', 'security', 'schemenameandplan'],
  folio: ['folio', 'folionumber', 'folionum', 'foliono'],
  fundHouse: ['amc', 'fundhouse', 'amcname', 'fundhousename'],
  date: ['date', 'transactiondate', 'trandate', 'tradedate', 'postdate', 'orderdate'],
  type: ['type', 'transactiontype', 'trantype', 'transaction', 'description', 'transactiondescription', 'narration'],
  amount: ['amount', 'transactionamount', 'amountinr', 'amountrs', 'value', 'investedamount'],
  units: ['units', 'unit', 'quantity', 'transactionunits', 'unitsallotted'],
  nav: ['nav', 'price', 'navprice', 'purchaseprice', 'unitprice', 'transactionprice'],
}

/** Map our field names to the column headings found in the file. */
export function detectColumns(headers) {
  const found = {}
  const normed = headers.map(norm)
  for (const [field, names] of Object.entries(ALIASES)) {
    const i = normed.findIndex((h) => names.includes(h))
    if (i >= 0) found[field] = headers[i]
  }
  return found
}

export function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v ?? '').trim()
  if (!s || s === '-') return null
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-')
  s = s.replace(/[^0-9.]/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? (neg ? -n : n) : null
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const iso = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null)

/** Accepts 2025-04-03, 03/04/2025, 03-04-2025 (day first), 03-Apr-2025 and Excel serial numbers. */
export function toISODate(v) {
  if (v instanceof Date && !isNaN(v)) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate())
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) }
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[a-z]*[-/ ,]+(\d{2,4})/)
  if (m) return iso(+m[3] < 100 ? 2000 + +m[3] : +m[3], MONTHS[m[2].toLowerCase()], +m[1])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (m) return iso(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1])
  return null
}

export function classifyType(text) {
  const t = String(text ?? '').toLowerCase()
  if (/redemp|\bsell\b|\bsale\b|sold|withdraw|switch[\s-]*out/.test(t)) return 'redeem'
  if (/\bsip\b|systematic/.test(t)) return 'sip'
  if (/stamp|\bstt\b|tds|\btax\b|charge/.test(t)) return 'skip'
  return 'lumpsum'
}

/** rows: array of objects keyed by the file's headings. Returns { txns, errors, columns }. */
export function parseStatementRows(rows) {
  const headers = rows.length ? Object.keys(rows[0]) : []
  const col = detectColumns(headers)
  const errors = []
  if (!col.name || !col.date || (!col.amount && !(col.units && col.nav))) {
    return { txns: [], errors: ['Could not find the fund name, date and amount (or units and NAV) columns.'], columns: col }
  }
  const txns = []
  rows.forEach((r, i) => {
    const line = i + 2
    const name = String(r[col.name] ?? '').trim()
    if (!name) return
    const date = toISODate(r[col.date])
    const type = col.type ? classifyType(r[col.type]) : 'lumpsum'
    if (type === 'skip') return
    let amount = toNumber(r[col.amount]), units = toNumber(r[col.units]), nav = toNumber(r[col.nav])
    if (amount != null) amount = Math.abs(amount)
    if (units != null) units = Math.abs(units)
    if (amount == null && units != null && nav) amount = units * nav
    if (units == null && amount != null && nav) units = amount / nav
    if (nav == null && amount != null && units) nav = amount / units
    if (!date) return errors.push(`Row ${line}: date not recognised`)
    if (!(amount > 0) || !(units > 0) || !(nav > 0)) return errors.push(`Row ${line}: needs an amount plus units or NAV`)
    txns.push({ name, folio: col.folio ? String(r[col.folio] ?? '').trim() : '', fundHouse: col.fundHouse ? String(r[col.fundHouse] ?? '').trim() : '', date, type, amount: Math.round(amount * 100) / 100, units: Math.round(units * 1000) / 1000, nav: Math.round(nav * 10000) / 10000 })
  })
  return { txns, errors, columns: col }
}

export const fundKey = (t) => `${String(t.folio || '').replace(/\s/g, '')}|${norm(t.name)}`

/** Group parsed transactions by fund (folio + name). */
export function groupByFund(txns) {
  const map = new Map()
  for (const t of txns) {
    const k = fundKey(t)
    if (!map.has(k)) map.set(k, { key: k, name: t.name, folio: t.folio, fundHouse: t.fundHouse, txns: [] })
    map.get(k).txns.push(t)
  }
  for (const g of map.values()) g.txns.sort((a, b) => a.date.localeCompare(b.date))
  return [...map.values()]
}

/** Net position from a fund's transactions (average-cost basis for redemptions). */
export function positionFrom(txns, start = { units: 0, invested: 0 }) {
  let units = start.units, invested = start.invested
  for (const t of txns) {
    if (t.type === 'redeem') {
      const avg = units > 0 ? invested / units : 0
      const u = Math.min(t.units, units)
      invested -= avg * u
      units -= u
    } else { units += t.units; invested += t.amount }
  }
  return { units: Math.round(units * 1000) / 1000, invested: Math.round(invested * 100) / 100 }
}
