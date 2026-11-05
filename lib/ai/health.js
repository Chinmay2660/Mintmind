// Financial Health Score: transparent rules only (no model-generated number). Not a credit score and not professional advice.
import { round2 } from '../wealth/calc.js'

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))

/** Each parameter: score 0-100, the measured value, the rule used, and a plain-language note. null score = no data (excluded). */
export function healthParameters(f, { monthlyIncome = 0 } = {}) {
  const P = []
  const add = (p) => P.push(p)

  const income = f.money.lastMonth?.income || f.money.thisMonth.income || monthlyIncome
  const saved = f.money.lastMonth ? f.money.lastMonth.saved : null
  const sr = f.money.lastMonth?.savingsRatePct
  add({ key: 'savings', name: 'Savings rate', weight: 20, value: sr == null ? null : `${sr}%`, rule: '20% or more of income saved = 100. Linear below that.', score: sr == null ? null : clamp((sr / 20) * 100), good: 'You are saving a healthy share of your income.', bad: 'Saving less than 20% of income last month.', action: 'Aim to save at least 20% of income; automate a transfer on salary day.' })

  const d = f.netWorth.debtToAssetPct
  add({ key: 'debt', name: 'Debt to assets', weight: 15, value: d == null ? null : `${d}%`, rule: 'Liabilities as % of assets. 0% = 100, 40% or more = 0.', score: d == null ? null : clamp(100 - (d / 40) * 100), good: 'Your debt is small relative to your assets.', bad: 'Debt is a large share of your assets.', action: 'Prioritise prepaying the highest-interest loan.' })

  const u = f.cards.limit > 0 ? f.cards.utilisationPct : null
  add({ key: 'utilisation', name: 'Credit card utilisation', weight: 10, value: u == null ? null : `${u}%`, rule: 'Up to 30% = 100. 90% or more = 0.', score: u == null ? null : clamp(u <= 30 ? 100 : 100 - ((u - 30) / 60) * 100), good: 'Card utilisation is in a healthy range.', bad: 'Card utilisation is high.', action: 'Pay down card balances to bring utilisation under 30%.' })

  const monthlyExpense = f.budget?.total || f.money.lastMonth?.expense || f.money.thisMonth.expense
  const liquid = f.banks.total
  const months = monthlyExpense > 0 ? round2(liquid / monthlyExpense) : null
  add({ key: 'emergency', name: 'Emergency fund', weight: 20, value: months == null ? null : `${months} months`, rule: 'Bank and cash balance divided by monthly spending. 6 months = 100.', score: months == null ? null : clamp((months / 6) * 100), good: 'Your liquid savings cover several months of spending.', bad: 'Liquid savings cover fewer than 6 months of spending.', action: 'Build liquid savings towards 6 months of expenses.' })

  const b = f.budget
  const adherence = b && b.dayToday > 0 ? clamp(b.status === 'over' ? 100 - (b.variance / Math.max(b.expectedTillToday, 1)) * 100 : 100) : null
  add({ key: 'budget', name: 'Budget adherence', weight: 15, value: b ? `${b.utilisationPct}% used, ${b.monthPassedPct}% of month gone` : null, rule: 'On or under the daily pace = 100. Each 1% over pace lowers the score by 1.', score: adherence, good: 'You are within your planned spending pace.', bad: 'Spending is running ahead of your plan.', action: 'Review the categories that are over their limits.' })

  const cover = f.insurance.coverTotal
  const annualIncome = income * 12
  const ratio = annualIncome > 0 ? round2((f.insurance.byType.term || 0) / annualIncome) : null
  add({ key: 'insurance', name: 'Life cover', weight: 10, value: ratio == null ? null : `${ratio}x annual income`, rule: 'Term cover of 10x annual income = 100. Linear below that.', score: ratio == null ? null : clamp((ratio / 10) * 100), good: 'Your term cover is a good multiple of your income.', bad: 'Term cover is below 10x annual income.', action: 'Review whether your term cover matches your dependants’ needs.' })

  const g = f.netWorth.vsLastYear?.pct
  add({ key: 'growth', name: 'Net worth growth', weight: 10, value: g == null ? null : `${g}% in 12 months`, rule: '10% or more yearly growth = 100. 0% = 40. Negative lowers it further.', score: g == null ? null : clamp(g >= 10 ? 100 : 40 + (g / 10) * 60), good: 'Your net worth is growing.', bad: 'Net worth growth is slow or negative.', action: 'Check whether savings and investments are keeping pace with spending.' })
  void saved; void cover
  return P
}

export function healthScore(f, opts) {
  const params = healthParameters(f, opts)
  const scored = params.filter((p) => p.score != null)
  const wsum = scored.reduce((s, p) => s + p.weight, 0)
  const score = wsum ? Math.round(scored.reduce((s, p) => s + p.score * p.weight, 0) / wsum) : null
  return {
    score, label: score == null ? 'Not enough data' : score >= 75 ? 'Strong' : score >= 50 ? 'Fair' : 'Needs attention', params,
    strengths: scored.filter((p) => p.score >= 75).map((p) => p.good),
    improvements: scored.filter((p) => p.score < 60).sort((a, z) => a.score - z.score).map((p) => p.bad),
    actions: scored.filter((p) => p.score < 60).sort((a, z) => a.score - z.score).map((p) => p.action),
    missing: params.filter((p) => p.score == null).map((p) => p.name),
    disclaimer: 'This is a simple educational score from rules you can see above. It is not a credit score or professional financial advice.',
  }
}
