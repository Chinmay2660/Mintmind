// Statement PDF parsers (pure, tested). They work on the plain text of a statement, line by line, and return what they found
// so the user can review it before anything is saved. Layouts follow the usual CAMS / KFintech CAS, NSDL / CDSL demat CAS,
// NPS (CRA) and EPFO passbook formats. They are heuristics: a layout we do not recognise yields nothing rather than guesses.

import { classifyType, toISODate, toNumber } from './statementImport.js'

const NUM = /^\(?-?[\d,]*\.?\d+\)?$/
const round2 = (n) => Math.round(n * 100) / 100
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const lines = (text) => String(text ?? '').split(/\r?\n/).map((l) => l.replace(/\s+$/g, '')).filter((l) => l.trim())

/** "(5,000.00)" -> -5000, "1,23,456.78" -> 123456.78 */
const amt = (t) => {
  const neg = /^\(.*\)$/.test(t) || t.startsWith('-')
  const n = toNumber(t.replace(/[()]/g, ''))
  return n == null ? null : neg ? -Math.abs(n) : n
}

const trailingNumbers = (rest) => {
  const toks = rest.trim().split(/\s+/)
  const nums = []
  while (toks.length && NUM.test(toks[toks.length - 1])) nums.unshift(toks.pop())
  return { desc: toks.join(' '), nums }
}

/* ───────────── Mutual funds: CAMS / KFintech CAS ───────────── */

const DATE_ROW = /^(\d{1,2}[-/ ][A-Za-z]{3}[-/ ]\d{4})\s+(.*)$/
const stripRtaCode = (n) => n.replace(/^(?=[A-Z0-9]*\d)[A-Z0-9]{2,12}\s*-\s*(?=[A-Za-z])/, '')

/** Returns { txns, closing } where txns match what groupByFund / importStatement expect. */
export function parseCas(text) {
  const txns = []
  const closing = {}
  let folio = '', fundHouse = '', scheme = '', isin = ''
  for (const line of lines(text)) {
    const t = clean(line)
    if (/mutual fund$/i.test(t) && !/folio/i.test(t) && t.length < 60) { fundHouse = t; continue }
    const fm = t.match(/Folio\s*No\.?\s*:\s*([A-Za-z0-9/ ]+?)(?=\s+PAN|\s+KYC|\s{2,}|$)/i)
    if (fm) { folio = fm[1].replace(/\s*\/\s*/g, '/').replace(/\s+/g, '').trim(); continue }
    if (/ISIN\s*:/i.test(t) && !DATE_ROW.test(t)) {
      const nameEnd = t.search(/\(Advisor|ISIN\s*:/i)
      scheme = stripRtaCode(clean(t.slice(0, nameEnd < 0 ? undefined : nameEnd))).replace(/\s*-\s*$/, '')
      isin = (t.match(/ISIN\s*:\s*(IN[A-Z0-9]{10})/i) || [])[1] || ''
      continue
    }
    const cl = t.match(/Closing\s+Unit\s+Balance\s*:\s*([\d,]*\.?\d+).*?NAV\s+on\s+(\d{1,2}[-/ ][A-Za-z]{3}[-/ ]\d{4})\s*:\s*(?:INR|Rs\.?)?\s*([\d,]*\.?\d+)/i)
    if (cl && scheme) { closing[`${folio}|${scheme}`] = { units: toNumber(cl[1]), date: toISODate(cl[2]), nav: toNumber(cl[3]) }; continue }
    const m = t.match(DATE_ROW)
    if (!m || !scheme) continue
    const { desc, nums } = trailingNumbers(m[2])
    if (nums.length < 3) continue // stamp duty, STT, TDS and address-style rows carry a single figure
    const amount = amt(nums[0]), units = amt(nums[1]), nav = amt(nums[2])
    const date = toISODate(m[1])
    if (!date || amount == null || units == null || !(nav > 0)) continue
    let type = classifyType(desc)
    if (type === 'skip') continue
    if (amount < 0 || units < 0) type = 'redeem'
    txns.push({ name: scheme, isin, folio, fundHouse, date, type, amount: round2(Math.abs(amount)), units: Math.round(Math.abs(units) * 1000) / 1000, nav: Math.round(nav * 10000) / 10000 })
  }
  return { txns, closing }
}

/* ───────────── Demat holdings: NSDL / CDSL CAS ───────────── */

/** Equity holdings (ISIN INE...). Mutual fund units in a demat (INF...) are counted but not imported as stocks. */
export function parseDemat(text) {
  const holdings = []
  let mfUnitsSkipped = 0
  for (const line of lines(text)) {
    const t = clean(line)
    const m = t.match(/\b(IN[EF][0-9A-Z]{9})\b\s+(.*)$/)
    if (!m) continue
    const { desc, nums } = trailingNumbers(m[2])
    if (nums.length < 2) continue
    const vals = nums.map((n) => toNumber(n)).filter((n) => n != null)
    if (vals.length < 2) continue
    // find units x price = value among the last numbers; fall back to the last figure as the value
    let units = null, price = null, value = vals[vals.length - 1]
    for (let i = vals.length - 3; i >= 0; i--) {
      const [u, p, v] = [vals[i], vals[i + 1], vals[i + 2]]
      if (v > 0 && Math.abs(u * p - v) <= Math.max(1, v * 0.01)) { units = u; price = p; value = v; break }
    }
    if (m[1].startsWith('INF')) { mfUnitsSkipped++; continue }
    const name = clean(desc.replace(/^[\s-]+/, '').replace(/^:\s*/, ''))
    if (!name || !(value > 0)) continue
    holdings.push({ isin: m[1], name, units, price, value: round2(value) })
  }
  return { holdings, mfUnitsSkipped }
}

/* ───────────── NPS ───────────── */

const moneyAfter = (t) => {
  const nums = t.match(/(?:₹|Rs\.?|INR)?\s*(\d[\d,]*\.\d{1,2}|\d[\d,]{4,})/g)
  if (!nums) return null
  const n = toNumber(nums[nums.length - 1].replace(/[^0-9.,]/g, ''))
  return n != null && n > 0 ? n : null
}
const asOf = (t) => { const m = t.match(/(?:as\s+on|as\s+of|dated?)\s*:?\s*(\d{1,2}[-/ ][A-Za-z0-9]{2,3}[-/ ]\d{2,4})/i); return m ? toISODate(m[1]) : null }

/** One entry per tier found, using the closing / total value of the statement. */
export function parseNps(text) {
  const out = []
  let tier = ''
  let when = null
  const seen = new Set()
  const all = lines(text)
  for (let i = 0; i < all.length; i++) {
    const t = clean(all[i])
    const tm = t.match(/\bTier\s*[- ]?\s*(I{1,2}|1|2)\b/i)
    if (tm) tier = /^(II|2)$/i.test(tm[1]) ? 'Tier II' : 'Tier I'
    when = asOf(t) || when
    if (!/(closing\s+balance|total\s+(?:portfolio\s+)?value|current\s+value|total\s+corpus|portfolio\s+value)/i.test(t)) continue
    const v = moneyAfter(t) ?? moneyAfter(clean(all[i + 1] || ''))
    if (!v) continue
    const key = tier || 'Tier I'
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name: `NPS ${key}`, value: round2(v), asOf: when })
  }
  return { accounts: out }
}

/* ───────────── EPF passbook ───────────── */

/** Closing balance rows: employee share + employer share (pension / EPS is a separate scheme and is reported, not added). */
export function parseEpf(text) {
  const accounts = []
  let when = null
  let member = ''
  for (const line of lines(text)) {
    const t = clean(line)
    const mm = t.match(/Member\s*(?:ID|Id)\s*[:\-]?\s*([A-Z0-9]{8,})/i)
    if (mm) member = mm[1]
    when = asOf(t) || when
    if (!/closing\s+balance/i.test(t)) continue
    const nums = (t.replace(/closing\s+balance(?:\s+as\s+on\s*:?\s*\d{1,2}[-/ ][A-Za-z0-9]{2,3}[-/ ]\d{2,4})?/i, ' ').match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => toNumber(n)).filter((n) => n != null)
    if (nums.length === 0) continue
    const [employee, employer, pension] = nums.length >= 3 ? nums : nums.length === 2 ? [nums[0], nums[1], 0] : [nums[0], 0, 0]
    const value = round2(employee + employer)
    if (!(value > 0)) continue
    accounts.push({ name: member ? `EPF (${member})` : 'EPF', value, employee, employer, pension: pension || 0, asOf: when })
  }
  return { accounts }
}

/** Runs every parser so one file (a combined CAS, for example) can contain several kinds of holdings. */
export function parseStatementText(text) {
  const cas = parseCas(text)
  const demat = parseDemat(text)
  const nps = parseNps(text)
  const epf = parseEpf(text)
  const found = []
  if (cas.txns.length) found.push('mutual fund transactions')
  if (demat.holdings.length) found.push('stock holdings')
  if (nps.accounts.length) found.push('NPS')
  if (epf.accounts.length) found.push('EPF')
  return { ...cas, ...demat, nps: nps.accounts, epf: epf.accounts, found }
}
