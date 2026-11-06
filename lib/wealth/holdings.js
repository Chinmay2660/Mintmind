// Asset and loan details (pure, tested). Fixed deposits accrue interest and gold follows the current rate,
// so their value is worked out from the details instead of typed in. Everything else keeps the value you enter.
// Self-contained on purpose: calc.js imports this, so it must not import calc.js.

const DAY = 86400000
const ms = (s) => new Date(`${s}T00:00:00`).getTime()
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const iso = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const r0 = (n) => Math.round(n)
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/** FD value today with quarterly compounding, frozen at maturity. */
export function fdValue(a, today = new Date()) {
  const principal = num(a.principal)
  if (!(principal > 0) || !a.startDate) return 0
  const t = midnight(today)
  const end = a.maturityDate && ms(a.maturityDate) < t ? ms(a.maturityDate) : t
  const years = Math.max(0, (end - ms(a.startDate)) / (365 * DAY))
  return r0(principal * Math.pow(1 + num(a.ratePct) / 400, 4 * years))
}

export function fdDetails(a, today = new Date()) {
  const principal = num(a.principal)
  const value = fdValue(a, today)
  let maturityValue = null, daysLeft = null
  if (a.maturityDate && a.startDate) {
    const term = (ms(a.maturityDate) - ms(a.startDate)) / (365 * DAY)
    maturityValue = r0(principal * Math.pow(1 + num(a.ratePct) / 400, 4 * Math.max(term, 0)))
    daysLeft = Math.round((ms(a.maturityDate) - midnight(today)) / DAY)
  }
  return { principal, value, interest: value - r0(principal), maturityValue, daysLeft, matured: daysLeft != null && daysLeft <= 0 }
}

export const KARAT = [24, 22, 18, 14]
export const goldValue = (a) => (num(a.grams) > 0 && num(a.rate24) > 0 ? r0(num(a.grams) * ((num(a.karat) || 24) / 24) * num(a.rate24)) : null)

/** Current value of any asset. */
export function assetValue(a, today = new Date()) {
  if (!a) return 0
  if (!a.manualValue) {
    if (a.category === 'fd' && num(a.principal) > 0 && a.startDate) return fdValue(a, today)
    if (a.category === 'gold') { const g = goldValue(a); if (g != null) return g }
  }
  return num(a.value)
}

/** What you put in, when known. */
export function assetInvested(a) {
  if (a.category === 'fd' && num(a.principal) > 0) return num(a.principal)
  if (a.category === 'gold' && num(a.grams) > 0 && num(a.buyPricePerGram) > 0) return r0(num(a.grams) * num(a.buyPricePerGram))
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
