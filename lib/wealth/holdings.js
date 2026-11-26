// Asset and loan details (pure, tested). Fixed deposits accrue interest and gold follows the current rate,
// so their value is worked out from the details instead of typed in. Everything else keeps the value you enter.
// Self-contained on purpose: calc.js imports this, so it must not import calc.js.

const DAY = 86400000
const ms = (s) => new Date(`${s}T00:00:00`).getTime()
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const iso = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const r0 = (n) => Math.round(n)
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/**
 * Years between two instants, counted the way a deposit term is: whole months first (so 1 Jan 2024 to 1 Jan 2025 is exactly one
 * year, leap year or not), then the leftover days over 365. Dividing a whole-year term by 365 days overstates a leap-year term.
 */
function termYears(fromMs, toMs) {
  if (!(toMs > fromMs)) return 0
  const a = new Date(fromMs), b = new Date(toMs)
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) m -= 1
  const anchor = new Date(a.getFullYear(), a.getMonth() + m, a.getDate()).getTime()
  return m / 12 + Math.max(0, toMs - anchor) / (365 * DAY)
}

/** FD value today with quarterly compounding, frozen at maturity. */
export function fdValue(a, today = new Date()) {
  const principal = num(a.principal)
  if (!(principal > 0) || !a.startDate) return 0
  const t = midnight(today)
  const end = a.maturityDate && ms(a.maturityDate) < t ? ms(a.maturityDate) : t
  const years = termYears(ms(a.startDate), end)
  return r0(principal * Math.pow(1 + num(a.ratePct) / 400, 4 * years))
}

export function fdDetails(a, today = new Date()) {
  const hasTerms = num(a.principal) > 0 && !!a.startDate && !a.manualValue
  const principal = num(a.principal) > 0 ? num(a.principal) : num(a.value)
  const value = hasTerms ? fdValue(a, today) : num(a.value) || principal
  let maturityValue = null, daysLeft = null
  if (hasTerms && a.maturityDate) {
    const term = termYears(ms(a.startDate), ms(a.maturityDate))
    maturityValue = r0(principal * Math.pow(1 + num(a.ratePct) / 400, 4 * Math.max(term, 0)))
    daysLeft = Math.round((ms(a.maturityDate) - midnight(today)) / DAY)
  }
  return { principal, value, interest: value - r0(principal), maturityValue, daysLeft, matured: daysLeft != null && daysLeft <= 0 }
}

/** Whole months from start to today (a month counts once its day-of-month has arrived). */
function monthsSince(startDate, today) {
  const s = new Date(`${startDate}T00:00:00`)
  let m = (today.getFullYear() - s.getFullYear()) * 12 + (today.getMonth() - s.getMonth())
  if (today.getDate() < s.getDate()) m -= 1
  return Math.max(0, m)
}

/**
 * Recurring deposit with quarterly compounding. One instalment goes in at the start of each month,
 * so after m whole months there are m + 1 instalments (capped at the tenure). Frozen at maturity.
 */
/** The day a recurring deposit matures: its start date plus the tenure in months (the last day of the month when that day does not exist). */
export function rdMaturityDate(a) {
  const tenure = Math.round(num(a.tenureMonths))
  if (!a.startDate || !(tenure > 0)) return null
  const [y, m, d] = String(a.startDate).slice(0, 10).split('-').map(Number)
  const t = new Date(y, m - 1 + tenure, 1)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(Math.min(d, last))}`
}

export function rdDetails(a, today = new Date()) {
  const inst = num(a.monthlyInstalment), tenure = Math.max(0, Math.round(num(a.tenureMonths)))
  if (!(inst > 0) || !a.startDate) return { paid: 0, invested: 0, value: 0, maturityValue: null, interest: 0, matured: false, tenure }
  const q = num(a.ratePct) / 400
  const grow = (months, count) => { let v = 0; for (let i = 0; i < count; i++) v += inst * Math.pow(1 + q, (months - i) / 3); return v }
  const elapsed = monthsSince(a.startDate, today)
  const evalM = tenure > 0 ? Math.min(elapsed, tenure) : elapsed
  const paid = tenure > 0 ? Math.min(evalM + 1, tenure) : evalM + 1
  const started = new Date(`${a.startDate}T00:00:00`).getTime() <= midnight(today)
  if (!started) return { paid: 0, invested: 0, value: 0, maturityValue: tenure > 0 ? r0(grow(tenure, tenure)) : null, interest: 0, matured: false, tenure }
  const value = grow(evalM, paid)
  return { paid, invested: r0(inst * paid), value: r0(value), maturityValue: tenure > 0 ? r0(grow(tenure, tenure)) : null, interest: r0(value - inst * paid), matured: tenure > 0 && elapsed >= tenure, tenure }
}
export const rdValue = (a, today = new Date()) => rdDetails(a, today).value

/** EPF: the passbook breakup. The total is employee + employer + EPS. */
export const epfShares = (a) => ({ employee: num(a.employeeShare), employer: num(a.employerShare), eps: num(a.epsShare) })
export const epfTotal = (a) => { const e = epfShares(a); return e.employee + e.employer + e.eps }

/** ETF (including gold ETFs): units, the average price paid per unit, and the latest NAV or price. */
export const etfDetails = (a) => {
  const units = num(a.units), avg = num(a.avgPrice), nav = num(a.currentNav)
  const invested = units > 0 && avg > 0 ? r0(units * avg) : num(a.invested) || 0
  const value = units > 0 && nav > 0 ? r0(units * nav) : num(a.value)
  return { units, avg, nav, invested, value, gain: invested > 0 ? value - invested : null, pct: invested > 0 ? Math.round(((value - invested) / invested) * 1000) / 10 : null }
}

export const KARAT = [24, 22, 18, 14]
export const goldValue = (a) => (num(a.grams) > 0 && num(a.rate24) > 0 ? r0(num(a.grams) * ((num(a.karat) || 24) / 24) * num(a.rate24)) : null)

/** Current value of any asset. */
export function assetValue(a, today = new Date()) {
  if (!a) return 0
  if (!a.manualValue) {
    if (a.category === 'fd' && num(a.principal) > 0 && a.startDate) return fdValue(a, today)
    if (a.category === 'gold') { const g = goldValue(a); if (g != null) return g }
    if (a.category === 'rd' && num(a.monthlyInstalment) > 0 && a.startDate) return rdValue(a, today)
    if (a.category === 'epf' && epfTotal(a) > 0) return epfTotal(a)
    if (a.category === 'etf' && num(a.units) > 0 && num(a.currentNav) > 0) return etfDetails(a).value
  }
  return num(a.value)
}

/** What you put in, when known. */
export function assetInvested(a) {
  if (a.category === 'fd' && num(a.principal) > 0) return num(a.principal)
  if (a.category === 'gold' && num(a.paidAmount) > 0) return num(a.paidAmount)
  if (a.category === 'gold' && num(a.grams) > 0 && num(a.buyPricePerGram) > 0) return r0(num(a.grams) * num(a.buyPricePerGram))
  if (a.category === 'rd' && num(a.monthlyInstalment) > 0 && a.startDate) return rdDetails(a).invested
  if (a.category === 'etf') { const d = etfDetails(a); return d.invested > 0 ? d.invested : null }
  if (a.category === 'realEstate' && num(a.purchasePrice) > 0) return num(a.purchasePrice)
  return num(a.invested) > 0 ? num(a.invested) : null
}

export function assetGain(a, today = new Date()) {
  const invested = assetInvested(a)
  if (!(invested > 0)) return null
  const value = assetValue(a, today)
  return { invested, value, gain: value - invested, pct: Math.round(((value - invested) / invested) * 1000) / 10 }
}

/** Months until a loan is cleared at the current EMI, or null if the EMI does not cover the interest. */
export function loanMonthsLeft(l) {
  const out = num(l.outstanding), emi = num(l.emi), r = num(l.rate) / 1200
  if (!(out > 0)) return 0
  if (!(emi > 0)) return null
  if (r === 0) return Math.ceil(out / emi)
  if (emi <= out * r) return null
  return Math.ceil(-Math.log(1 - (out * r) / emi) / Math.log(1 + r))
}

export function loanEndDate(l, today = new Date()) {
  const m = loanMonthsLeft(l)
  if (m == null) return null
  const d = new Date(today.getFullYear(), today.getMonth() + m, today.getDate())
  return iso(d.getTime())
}

/** Share of the original principal already repaid, when the original amount is known. */
export const loanRepaidPct = (l) => (num(l.principal) > 0 ? Math.max(0, Math.min(100, Math.round((1 - num(l.outstanding) / num(l.principal)) * 100))) : null)

export const loansFor = (asset, liabilities = []) => liabilities.filter((l) => l.linkedAssetId === asset.id)
/** Your share of an asset after the loans taken against it. */
export const equityIn = (asset, liabilities = [], today = new Date()) => assetValue(asset, today) - loansFor(asset, liabilities).reduce((s, l) => s + num(l.outstanding), 0)

/**
 * Renewing a matured fixed deposit: the same deposit starts again on its maturity date, with the maturity amount (the
 * principal plus the interest it earned) as the new principal. The rate stays as it was and the new maturity date is left for
 * you to fill in, because a renewal usually comes with new terms. The old terms are kept in `renewals`.
 * Returns the updated asset, or null when it cannot be renewed (not an FD, not matured, or missing dates).
 */
export function renewFd(a, today = new Date()) {
  if (!a || a.category !== 'fd') return null
  const d = fdDetails(a, today)
  if (!d.matured || d.maturityValue == null || !a.maturityDate) return null
  return {
    ...a,
    principal: d.maturityValue,
    startDate: a.maturityDate,
    maturityDate: '',
    renewals: [...(a.renewals || []), { date: a.maturityDate, principal: num(a.principal), ratePct: num(a.ratePct), maturityValue: d.maturityValue }],
  }
}
