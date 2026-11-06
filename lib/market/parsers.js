// Parsers and matching for market prices (pure, tested). Two sources:
//  - AMFI's public daily NAV file (no login): Scheme Code;ISIN Payout/Growth;ISIN Reinvest;Scheme Name;NAV;Date
//  - Kite Connect /mf/instruments CSV (needs the app's Kite session)

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

/** "05-Nov-2026" or "2026-11-05" to ISO, else null. */
export function isoDate(s) {
  const t = String(s || '').trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  if (m && MON[m[2].toLowerCase()]) return `${m[3]}-${String(MON[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

/** Lowercase, drop the plan/option boilerplate so "X Fund - Direct Plan - Growth" equals "X Fund - Direct Growth". */
export function nameKey(name) {
  return String(name || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/\b(plan|option|scheme)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function parseAmfi(text) {
  const out = []
  for (const line of String(text || '').split(/\r?\n/)) {
    const p = line.split(';')
    if (p.length < 6 || !/^\d+$/.test(p[0].trim())) continue
    const nav = Number(p[4])
    const date = isoDate(p[5])
    if (!(nav > 0) || !date) continue
    const isins = [p[1], p[2]].map((x) => x.trim()).filter((x) => /^IN[A-Z0-9]{10}$/.test(x))
    out.push({ kind: 'mf', source: 'amfi', schemeCode: p[0].trim(), isins, name: p[3].trim(), nameKey: nameKey(p[3]), price: nav, priceDate: date })
  }
  return out
}

function csvLine(line) {
  const cells = []
  let cur = '', q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) { cells.push(cur); cur = '' } else cur += ch
  }
  cells.push(cur)
  return cells
}

export function parseKiteMfCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const head = csvLine(lines[0]).map((h) => h.trim())
  const ix = (n) => head.indexOf(n)
  const [iSym, iName, iPrice, iDate] = [ix('tradingsymbol'), ix('name'), ix('last_price'), ix('last_price_date')]
  if ([iSym, iName, iPrice].some((i) => i < 0)) return []
  const out = []
  for (const l of lines.slice(1)) {
    const c = csvLine(l)
    const price = Number(c[iPrice])
    if (!(price > 0)) continue
    out.push({ kind: 'mf', source: 'kite', schemeCode: '', isins: /^IN[A-Z0-9]{10}$/.test(c[iSym]) ? [c[iSym]] : [], symbol: c[iSym], name: c[iName], nameKey: nameKey(c[iName]), price, priceDate: iDate >= 0 ? isoDate(c[iDate]) : null })
  }
  return out
}

/** Equity last-traded prices from Kite /quote/ltp: { "NSE:INFY": { last_price } }. */
export function parseKiteLtp(data) {
  return Object.entries(data || {}).filter(([, v]) => v && v.last_price > 0).map(([sym, v]) => ({ kind: 'equity', source: 'kite', symbol: sym, name: sym.split(':')[1] || sym, nameKey: nameKey(sym), isins: [], price: Number(v.last_price), priceDate: null }))
}

/** How to look up a fund: identifiers first (safe), exact normalised name last. Returns the matching price row or null. */
export function matchFund(fund, rows) {
  const id = [fund.isin, fund.symbol].filter(Boolean)
  if (id.length) { const r = rows.find((x) => x.isins?.some((i) => id.includes(i)) || id.includes(x.symbol)); if (r) return r }
  if (fund.schemeCode) { const r = rows.find((x) => x.schemeCode && String(x.schemeCode) === String(fund.schemeCode)); if (r) return r }
  const k = nameKey(fund.name)
  if (!k) return null
  const same = rows.filter((x) => x.nameKey === k)
  return same.length === 1 ? same[0] : null // ambiguous names are never guessed
}
