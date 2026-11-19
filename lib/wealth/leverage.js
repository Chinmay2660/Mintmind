import { assetValue } from './holdings.js'

const num = (v) => Number(v) || 0
const pct1 = (n) => Math.round(n * 10) / 10

/**
 * How much of what you own is financed by debt, and how heavy the repayments are.
 * Every figure whose inputs are missing is null, so the screen can leave it out instead of showing a made-up zero.
 *   assets, liabilities, bank : totals (liabilities include card dues)
 *   loans   : [{ name, outstanding, emi, rate, linkedAssetId }]
 *   assetList : the asset records (to find the value of a secured asset)
 *   cards   : [{ limit, outstanding }]
 *   monthlyIncome : from the profile
 * The bands (30 and 40 percent) are common rules of thumb for repayments against income, not advice.
 */
export function leverageMetrics({ assets = 0, liabilities = 0, bank = 0, loans = [], assetList = [], cards = [], monthlyIncome = 0, today = new Date() }) {
  const netWorth = assets - liabilities
  const emi = loans.reduce((s, l) => s + num(l.emi), 0)
  const principal = loans.reduce((s, l) => s + num(l.outstanding), 0)
  const rated = loans.filter((l) => num(l.rate) > 0 && num(l.outstanding) > 0)
  const ratedPrincipal = rated.reduce((s, l) => s + num(l.outstanding), 0)
  const limit = cards.reduce((s, c) => s + num(c.limit), 0)
  const used = cards.reduce((s, c) => s + num(c.outstanding), 0)
  const emiToIncomePct = monthlyIncome > 0 && emi > 0 ? pct1((emi / monthlyIncome) * 100) : null

  const secured = loans.filter((l) => l.linkedAssetId).map((l) => {
    const a = assetList.find((x) => x.id === l.linkedAssetId)
    const value = a ? assetValue(a, today) : 0
    return { name: l.name, outstanding: num(l.outstanding), assetName: a?.name ?? null, assetValue: value, ltvPct: value > 0 ? pct1((num(l.outstanding) / value) * 100) : null }
  })

  return {
    netWorth,
    debtToAssetsPct: assets > 0 ? pct1((liabilities / assets) * 100) : null,
    debtToNetWorthPct: netWorth > 0 ? pct1((liabilities / netWorth) * 100) : null,
    // assets for every rupee of your own money; 1.0 means no debt at all
    leverageMultiple: netWorth > 0 ? Math.round((assets / netWorth) * 100) / 100 : null,
    monthlyRepayments: emi,
    emiToIncomePct,
    emiBand: emiToIncomePct == null ? null : emiToIncomePct <= 30 ? 'comfortable' : emiToIncomePct <= 40 ? 'watch' : 'high',
    weightedRatePct: ratedPrincipal > 0 ? Math.round((rated.reduce((s, l) => s + num(l.outstanding) * num(l.rate), 0) / ratedPrincipal) * 100) / 100 : null,
    loanPrincipal: principal,
    cardUtilisationPct: limit > 0 ? pct1((used / limit) * 100) : null,
    liquidCoveragePct: liabilities > 0 ? pct1((bank / liabilities) * 100) : null,
    monthsOfRepaymentsInCash: emi > 0 ? Math.round((bank / emi) * 10) / 10 : null,
    secured,
  }
}

/** Allocation: each asset class as a share of total assets, largest first, zero classes left out. */
export function allocation(assetBreakdown = {}) {
  const total = Object.values(assetBreakdown).reduce((s, v) => s + num(v), 0)
  return Object.entries(assetBreakdown).filter(([, v]) => num(v) > 0).map(([key, v]) => ({ key, value: Math.round(num(v)), pct: total ? pct1((num(v) / total) * 100) : 0 })).sort((a, b) => b.value - a.value)
}
