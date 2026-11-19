// Reading a bank or app export (CSV) into transactions. Pure and tested. Nothing is saved here.

/** Parse CSV text into rows of cells. Handles quoted cells, doubled quotes, commas and line breaks inside quotes, and a leading BOM. */
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '')
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false }
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((c) => c.trim() !== '')) rows.push(row); row = [] }
    else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows.map((r) => r.map((c) => c.trim()))
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const iso = (y, m, d) => (y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate() ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null)

/** A date as YYYY-MM-DD, or null. Accepts 2026-11-05, 05/11/2026, 05-11-2026, 05.11.2026 (day first) and 5 Nov 2026. `monthFirst` reads 11/05/2026 as 5 November. */
export function parseDate(v, { monthFirst = false } = {}) {
  const s = String(v ?? '').trim()
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s)
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return monthFirst ? iso(y, +m[1], +m[2]) : iso(y, +m[2], +m[1]) }
  m = /^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-,]*(\d{2,4})/.exec(s)
  if (m && MONTHS[m[2].toLowerCase()]) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return iso(y, MONTHS[m[2].toLowerCase()], +m[1]) }
  return null
}

/** A money amount as a number: "₹1,500.50", "(250)", "-250", "250 Dr" and "250 Cr" (Dr is negative). Returns null when it is not a number. */
export function parseAmount(v) {
  let s = String(v ?? '').trim()
  if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1) }
  if (/\bdr\b\.?$/i.test(s)) neg = true
  s = s.replace(/\b(dr|cr)\b\.?/gi, '').replace(/[₹$€£,\s]/g, '')
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1) } else if (s.startsWith('+')) s = s.slice(1)
  if (!/^\d*\.?\d+$/.test(s)) return null
  const n = Number(s)
  return neg ? -n : n
}

/** Guess which column holds what from the header row. Each value is a column index or -1. */
export function detectColumns(header) {
  const find = (...res) => header.findIndex((h) => res.some((r) => r.test(h)))
  return {
    date: find(/^date$/i, /txn date|transaction date|value date|posting date|booking date/i, /date/i),
    description: find(/description|narration|details|particulars|payee|merchant|memo|note|remarks/i),
    amount: find(/^amount$/i, /amount|value/i),
    debit: find(/debit|withdraw|money out|paid out|dr\b/i),
    credit: find(/credit|deposit|money in|paid in|cr\b/i),
    category: find(/category/i),
  }
}

/**
 * Turn rows into transactions. A positive amount is money in (income) and a negative one is an expense, unless
 * `invert` is set (some exports list spending as positive). With separate debit and credit columns, those decide.
 * Returns { items, skipped } where skipped lists rows that could not be read, with the reason.
 */
export function toTransactions(rows, map, { monthFirst = false, invert = false } = {}) {
  const items = [], skipped = []
  rows.forEach((r, i) => {
    const date = parseDate(r[map.date], { monthFirst })
    if (!date) return skipped.push({ row: i + 2, reason: 'No readable date' })
    let amt = null
    if (map.debit >= 0 || map.credit >= 0) {
      const d = parseAmount(r[map.debit]), c = parseAmount(r[map.credit])
      if (d != null && d !== 0) amt = -Math.abs(d)
      else if (c != null && c !== 0) amt = Math.abs(c)
    } else if (map.amount >= 0) amt = parseAmount(r[map.amount])
    if (amt == null || amt === 0) return skipped.push({ row: i + 2, reason: 'No amount' })
    if (invert) amt = -amt
    const note = String(r[map.description] ?? '').trim()
    items.push({ kind: amt < 0 ? 'expense' : 'income', date, amount: Math.abs(Math.round(amt * 100) / 100), note, category: map.category >= 0 ? String(r[map.category] ?? '').trim() : '' })
  })
  return { items, skipped }
}
