// Pure finance calculations. No I/O, no framework imports — unit-testable with `node --test`.

const DAY_MS = 86400000

export function parseDate(d) {
  if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function toISO(d) {
  const x = d instanceof Date ? d : parseDate(d)
  const p = (n) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}

/** Real calendar days in a month (month is 1-12). Handles Feb and leap years. */
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0)

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

/**
 * Day-wise budget pacing.
 * expectedCum(day) = budget / daysInMonth * day   (the pace line — NOT the remaining budget)
 * remaining        = budget - spent               (what is left to spend)
 */
export function budgetPacing({ budget, expenses, year, month, today = new Date() }) {
  const days = daysInMonth(year, month)
  const dailyBudget = days ? budget / days : 0
  const t = parseDate(today)
  const isCurrent = t.getFullYear() === year && t.getMonth() + 1 === month
  const isPast = t.getFullYear() * 12 + t.getMonth() > year * 12 + (month - 1)
  const dayToday = isCurrent ? t.getDate() : isPast ? days : 0

  const perDay = new Array(days).fill(0)
  for (const e of expenses) {
    const d = parseDate(e.date)
    if (d.getFullYear() === year && d.getMonth() + 1 === month) perDay[d.getDate() - 1] += Number(e.amount) || 0
  }

  const series = []
  let cum = 0
  for (let day = 1; day <= days; day++) {
    cum += perDay[day - 1]
    series.push({
      day,
      expected: round2(dailyBudget * day),
      // actual line stops at today (null afterwards) so the chart never invents the future
      actual: day <= dayToday ? round2(cum) : null,
      spentThatDay: perDay[day - 1],
    })
  }

  const spent = sum(perDay)
  const expectedTillToday = round2(dailyBudget * dayToday)
  const variance = round2(spent - expectedTillToday) // >0 over pace, <0 under pace
  const projected = dayToday > 0 ? round2((spent / dayToday) * days) : 0

  return {
    days,
    dayToday,
    dailyBudget: round2(dailyBudget),
    spent: round2(spent),
    remaining: round2(budget - spent),
    expectedTillToday,
    variance,
    status: variance > 0 ? 'over' : variance < 0 ? 'under' : 'on-track',
    projected,
    projectedOver: round2(projected - budget),
    utilisation: budget > 0 ? round2((spent / budget) * 100) : 0,
    remainingDays: days - dayToday,
    safeDailySpend: days - dayToday > 0 ? round2(Math.max(budget - spent, 0) / (days - dayToday)) : 0,
    series,
  }
}

/** Credit utilisation %, e.g. limit 2,00,000 & outstanding 45,000 -> 22.5 */
export function cardUtilisation(limit, outstanding) {
  if (!limit || limit <= 0) return 0
  return round2((outstanding / limit) * 100)
}

/**
 * XIRR on dated cash flows (negative = money invested, positive = money received/current value).
 * Uses actual/365 like Excel's XIRR. Returns a decimal (0.12 = 12%) or null if undefined.
 */
export function xirr(cashflows, guess = 0.1) {
  const flows = cashflows
    .map((c) => ({ t: parseDate(c.date).getTime(), a: Number(c.amount) || 0 }))
    .filter((c) => c.a !== 0)
    .sort((a, b) => a.t - b.t)
  if (flows.length < 2) return null
  if (!flows.some((f) => f.a > 0) || !flows.some((f) => f.a < 0)) return null
  const t0 = flows[0].t
  const yrs = flows.map((f) => (f.t - t0) / DAY_MS / 365)
  if (yrs[yrs.length - 1] === 0) return null
  const npv = (r) => flows.reduce((s, f, i) => s + f.a / Math.pow(1 + r, yrs[i]), 0)
  const dnpv = (r) => flows.reduce((s, f, i) => s - (yrs[i] * f.a) / Math.pow(1 + r, yrs[i] + 1), 0)

  let r = guess
  for (let i = 0; i < 100; i++) {
    const f = npv(r)
    const d = dnpv(r)
    if (!isFinite(f) || !isFinite(d) || d === 0) break
    const next = r - f / d
    if (next <= -0.999999) break
    if (Math.abs(next - r) < 1e-10) return next
    r = next
  }
  // Bisection fallback
  let lo = -0.9999
  let hi = 100
  let flo = npv(lo)
  const fhi = npv(hi)
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2
    const fm = npv(mid)
    if (Math.abs(fm) < 1e-7) return mid
    if (flo * fm < 0) hi = mid
    else {
      lo = mid
      flo = fm
    }
  }
  return (lo + hi) / 2
}

/** Dated cashflows for a fund: each investment is an outflow, current value an inflow on `asOf`. */
export function fundCashflows(fund, txns, asOf = new Date()) {
  const flows = txns
    .filter((t) => t.fundId === fund.id)
    .map((t) => ({ date: t.date, amount: t.type === 'redeem' ? Math.abs(t.amount) : -Math.abs(t.amount) }))
  if (!flows.length && fund.invested) flows.push({ date: fund.investmentDate, amount: -fund.invested })
  flows.push({ date: toISO(asOf), amount: Number(fund.currentValue) || 0 })
  return flows
}

export function fundMetrics(fund, txns = [], asOf = new Date()) {
  const invested = Number(fund.invested) || 0
  const value = Number(fund.currentValue) || 0
  const abs = value - invested
  const x = xirr(fundCashflows(fund, txns, asOf))
  return {
    invested,
    value,
    absReturn: round2(abs),
    absReturnPct: invested > 0 ? round2((abs / invested) * 100) : 0,
    avgNav: fund.units > 0 ? round2(invested / fund.units) : 0,
    xirrPct: x == null ? null : round2(x * 100),
  }
}

export function monthlyEquivalent(sip) {
  const a = Number(sip.amount) || 0
  return { daily: a * 30, weekly: (a * 52) / 12, monthly: a, quarterly: a / 3, yearly: a / 12 }[sip.frequency] ?? a
}

export function portfolioSummary(funds, txns, sips, asOf = new Date()) {
  const invested = sum(funds, (f) => f.invested)
  const value = sum(funds, (f) => f.currentValue)
  const all = []
  for (const f of funds) all.push(...fundCashflows(f, txns, asOf).slice(0, -1))
  if (funds.length) all.push({ date: toISO(asOf), amount: value })
  const x = xirr(all)
  // Today's gain only where a previous NAV is known — never fabricated
  let today = 0
  let hasToday = false
  for (const f of funds) {
    if (f.prevNav > 0 && f.currentNav > 0) {
      today += (f.currentNav - f.prevNav) * f.units
      hasToday = true
    }
  }
  const activeSips = sips.filter((s) => s.status === 'active')
  return {
    invested: round2(invested),
    value: round2(value),
    absReturn: round2(value - invested),
    absReturnPct: invested > 0 ? round2(((value - invested) / invested) * 100) : 0,
    xirrPct: x == null ? null : round2(x * 100),
    todayGain: hasToday ? round2(today) : null,
    fundCount: funds.length,
    activeSips: activeSips.length,
    monthlySipCommitment: round2(sum(activeSips, monthlyEquivalent)),
  }
}

/** Add `months` to an ISO date keeping day-of-month clamped. */
export function addMonths(iso, months) {
  const d = parseDate(iso)
  const m = d.getMonth() + months
  const y = d.getFullYear() + Math.floor(m / 12)
  const mm = ((m % 12) + 12) % 12
  return toISO(new Date(y, mm, Math.min(d.getDate(), daysInMonth(y, mm + 1))))
}

/** Next SIP debit date on or after `from`; null when stopped, finished or past end date. */
export function nextSipDate(sip, from = new Date()) {
  const f = parseDate(from)
  const start = parseDate(sip.startDate)
  const end = sip.endDate ? parseDate(sip.endDate) : null
  if (sip.status !== 'active') return null
  if (sip.instalmentsTotal && sip.instalmentsCompleted >= sip.instalmentsTotal) return null
  const stepMonths = { monthly: 1, quarterly: 3, yearly: 12 }[sip.frequency]
  let d
  if (stepMonths) {
    const day = sip.debitDay || start.getDate()
    d = new Date(start.getFullYear(), start.getMonth(), Math.min(day, daysInMonth(start.getFullYear(), start.getMonth() + 1)))
    let guard = 0
    while (d < f && guard++ < 2000) {
      const m = d.getMonth() + stepMonths
      const y = d.getFullYear() + Math.floor(m / 12)
      const mm = m % 12
      d = new Date(y, mm, Math.min(day, daysInMonth(y, mm + 1)))
    }
  } else {
    const step = sip.frequency === 'weekly' ? 7 : 1
    d = start
    if (d < f) d = new Date(d.getTime() + Math.ceil((f - d) / DAY_MS / step) * step * DAY_MS)
  }
  if (end && d > end) return null
  return toISO(d)
}

/**
 * Net worth = assets - liabilities.
 * - Bank balances, MF value and manual assets are assets (each source counted once).
 * - Card outstanding + loans are liabilities.
 * - Insurance cover is NOT an asset. Transfers/expenses/repayments never appear here:
 *   balances already reflect them, so nothing can be double counted.
 */
export function computeNetWorth({ banks = [], funds = [], assets = [], cards = [], liabilities = [] }) {
  const breakdown = {
    bank: sum(banks, (b) => b.currentBalance),
    mutualFunds: sum(funds, (f) => f.currentValue),
  }
  for (const a of assets) breakdown[a.category] = (breakdown[a.category] || 0) + (Number(a.value) || 0)
  const liab = { creditCards: sum(cards, (c) => c.outstanding) }
  for (const l of liabilities) liab[l.category] = (liab[l.category] || 0) + (Number(l.outstanding) || 0)
  const totalAssets = sum(Object.values(breakdown))
  const totalLiabilities = sum(Object.values(liab))
  return {
    assets: round2(totalAssets),
    liabilities: round2(totalLiabilities),
    netWorth: round2(totalAssets - totalLiabilities),
    assetBreakdown: breakdown,
    liabilityBreakdown: liab,
  }
}

/** Compare current net worth to the snapshot nearest on/before `monthsBack` months ago. */
export function growthVs(snapshots, current, monthsBack, today = new Date()) {
  if (!snapshots.length) return null
  const target = addMonths(toISO(today), -monthsBack)
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  let base = null
  for (const s of sorted) if (s.date <= target) base = s
  if (!base) return null
  const diff = current - base.netWorth
  return {
    base: base.netWorth,
    baseDate: base.date,
    diff: round2(diff),
    pct: base.netWorth !== 0 ? round2((diff / Math.abs(base.netWorth)) * 100) : null,
  }
}

const clamp = (n) => Math.max(0, Math.min(100, n))

/** Transparent rule-based financial health score (0-100). */
export function healthScore({ assets, liabilities, monthlyExpense, liquid, utilisation, insuranceCover, annualIncome }) {
  const parts = []
  const debtRatio = assets > 0 ? liabilities / assets : 1
  parts.push({ key: 'Debt to assets', score: clamp(100 - debtRatio * 250), detail: `${round2(debtRatio * 100)}%` })
  const months = monthlyExpense > 0 ? liquid / monthlyExpense : 12
  parts.push({ key: 'Emergency fund', score: clamp((months / 6) * 100), detail: `${round2(months)} months` })
  parts.push({ key: 'Card utilisation', score: clamp(100 - Math.max(utilisation - 30, 0) * 2), detail: `${round2(utilisation)}%` })
  if (annualIncome > 0) {
    const ratio = insuranceCover / annualIncome
    parts.push({ key: 'Insurance cover', score: clamp((ratio / 10) * 100), detail: `${round2(ratio)}x income` })
  }
  const score = Math.round(sum(parts, (p) => p.score) / parts.length)
  return { score, parts, label: score >= 75 ? 'Strong' : score >= 50 ? 'Fair' : 'Needs attention' }
}

/** ISO start date for a range filter key. */
export function rangeStart(range, today = new Date()) {
  const t = toISO(today)
  return { '1M': addMonths(t, -1), '3M': addMonths(t, -3), '6M': addMonths(t, -6), '1Y': addMonths(t, -12), ALL: '0000-00-00' }[range] ?? '0000-00-00'
}
