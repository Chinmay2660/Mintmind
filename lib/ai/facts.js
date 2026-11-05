// Deterministic "facts" about the user's finances. EVERY number the assistant, insights, reports and health score
// show comes from here (authoritative application code). An AI provider, when enabled, may only phrase these facts;
// it never calculates, estimates or changes financial records.
import { addMonths, budgetPacing, cardUtilisation, growthVs, portfolioSummary, round2, toISO, fundMetrics, nextSipDate, monthlyEquivalent } from '../wealth/calc.js'
import { coverageTotals, monthKey, lastMonths, monthLabel, annualPremium } from '../wealth/selectors.js'
import { upcomingCardDues, upcomingPremiums, upcomingSips, expiringPolicies } from '../wealth/reminders.js'
import { buildTransactions, inMonth, monthSummary, categoryBreakdown } from '../wealth/transactions.js'

const INVESTED_KEYS = ['mutualFunds', 'stocks', 'epf', 'ppf', 'nps', 'fd', 'gold']

const pct = (a, b) => (b ? round2((a / Math.abs(b)) * 100) : null)

export function buildFacts(data, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const iso = toISO(t)
  const ym = iso.slice(0, 7)
  const prevYm = addMonths(`${ym}-01`, -1).slice(0, 7)
  const gaps = []

  // ---------- net worth ----------
  const nw = data.netWorth
  const snaps = [...(data.snapshots || [])].sort((a, b) => a.date.localeCompare(b.date))
  const vsMonth = growthVs(snaps, nw.netWorth, 1, t)
  const vsYear = growthVs(snaps, nw.netWorth, 12, t)
  const jan1 = snaps.filter((s) => s.date <= `${t.getFullYear() - 1}-12-31`).pop()
  const ytd = jan1 ? { diff: round2(nw.netWorth - jan1.netWorth), pct: pct(nw.netWorth - jan1.netWorth, jan1.netWorth), baseDate: jan1.date } : null
  const base = vsMonth ? snaps.find((s) => s.date === vsMonth.baseDate) : null
  let contributors = []
  if (base) {
    const keys = new Set([...Object.keys(nw.assetBreakdown), ...Object.keys(base.assetBreakdown || {})])
    contributors = [...keys].map((k) => ({ key: k, diff: round2((nw.assetBreakdown[k] || 0) - ((base.assetBreakdown || {})[k] || 0)) })).filter((c) => c.diff !== 0).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  } else gaps.push('Net worth history is too short to compare with last month.')
  const liabDiff = base ? round2(nw.liabilities - base.liabilities) : null
  const investedValue = INVESTED_KEYS.reduce((s, k) => s + (nw.assetBreakdown[k] || 0), 0)
  const netWorth = {
    current: nw.netWorth, assets: nw.assets, liabilities: nw.liabilities, assetBreakdown: nw.assetBreakdown, liabilityBreakdown: nw.liabilityBreakdown,
    vsLastMonth: vsMonth, vsLastYear: vsYear, yearToDate: ytd, contributors, liabilityChange: liabDiff,
    investedValue: round2(investedValue), investedSharePct: pct(investedValue, nw.assets), debtToAssetPct: pct(nw.liabilities, nw.assets),
  }

  // ---------- money in / out ----------
  const txAll = buildTransactions({ expenses: data.expenses, bankTxns: data.bankTxns, transfers: data.transfers || [], bankAccounts: data.bankAccounts, cards: data.cards })
  const txMonth = inMonth(txAll, ym)
  const txPrev = inMonth(txAll, prevYm)
  const cur = monthSummary(txMonth)
  const prev = monthSummary(txPrev)

  // ---------- budget ----------
  const b = (data.budgets || []).find((x) => x.id === ym)
  const pb = (data.budgets || []).find((x) => x.id === prevYm)
  let budget = null
  if (b && b.total > 0) {
    const p = budgetPacing({ budget: b.total, expenses: data.expenses, year: t.getFullYear(), month: t.getMonth() + 1, today: t })
    const catNow = Object.fromEntries(categoryBreakdown(txMonth, 'expense').map((c) => [c.name, c.value]))
    const catPrev = Object.fromEntries(categoryBreakdown(txPrev, 'expense').map((c) => [c.name, c.value]))
    // average of the three months before this one, for anomaly detection
    const hist = [1, 2, 3].map((n) => categoryBreakdown(inMonth(txAll, addMonths(`${ym}-01`, -n).slice(0, 7)), 'expense'))
    const avg = {}
    for (const h of hist) for (const c of h) avg[c.name] = (avg[c.name] || 0) + c.value / 3
    const names = new Set([...Object.keys(catNow), ...Object.keys(b.categories || {})])
    const categories = [...names].map((name) => {
      const limit = Number((b.categories || {})[name]) || 0
      const spent = catNow[name] || 0
      const days = p.days
      const dailyLimit = limit ? round2(limit / days) : 0
      return { name, limit, spent: round2(spent), prevSpent: round2(catPrev[name] || 0), avg3m: round2(avg[name] || 0), changeVsPrevPct: catPrev[name] ? pct(spent - catPrev[name], catPrev[name]) : null, dailyLimit, expectedTillToday: round2(dailyLimit * p.dayToday), utilisationPct: limit ? pct(spent, limit) : null }
    }).sort((a, z) => z.spent - a.spent)
    budget = {
      ym, label: monthLabel(ym), total: b.total, spent: p.spent, remaining: p.remaining, utilisationPct: p.utilisation, days: p.days, dayToday: p.dayToday, remainingDays: p.remainingDays,
      dailyBudget: p.dailyBudget, expectedTillToday: p.expectedTillToday, variance: p.variance, status: p.status, projected: p.projected, projectedOver: p.projectedOver,
      // what you can spend TODAY while staying on pace (not the same as remaining budget / days)
      allowanceToday: round2(Math.max(p.expectedTillToday + p.dailyBudget - p.spent, 0)), safeDailySpend: p.safeDailySpend,
      monthPassedPct: pct(p.dayToday, p.days), categories, topCategory: categories[0] || null,
      prevTotal: pb?.total ?? null,
    }
  } else gaps.push(`No budget is set for ${monthLabel(ym)}.`)
  const prevIncomeExpense = txPrev.length ? { income: prev.income, expense: prev.expense, saved: round2(prev.income - prev.expense), savingsRatePct: prev.income ? pct(prev.income - prev.expense, prev.income) : null, label: monthLabel(prevYm) } : null
  const money = { thisMonth: { ...cur, label: monthLabel(ym), savingsRatePct: cur.income ? pct(cur.income - cur.expense, cur.income) : null }, lastMonth: prevIncomeExpense, topExpenseCategories: categoryBreakdown(txMonth, 'expense').slice(0, 5) }
  if (!prevIncomeExpense) gaps.push('No income or expense data for last month.')

  // ---------- mutual funds ----------
  const summary = portfolioSummary(data.funds, data.fundTxns, data.sips, t)
  const totalValue = summary.value || 0
  const perFund = data.funds.map((f) => { const m = fundMetrics(f, data.fundTxns, t); return { id: f.id, name: f.name, invested: m.invested, value: m.value, absReturn: m.absReturn, absReturnPct: m.absReturnPct, xirrPct: m.xirrPct, sharePct: pct(m.value, totalValue), navDate: f.navDate, navSource: f.navSource } }).sort((a, z) => z.value - a.value)
  const mfNow = nw.assetBreakdown.mutualFunds || 0
  const mfBase = base ? (base.assetBreakdown || {}).mutualFunds || 0 : null
  const contributions = round2(data.fundTxns.filter((x) => monthKey(x.date) === ym && x.type !== 'redeem').reduce((s, x) => s + (Number(x.amount) || 0), 0))
  const prevContrib = round2(data.fundTxns.filter((x) => monthKey(x.date) === prevYm && x.type !== 'redeem').reduce((s, x) => s + (Number(x.amount) || 0), 0))
  const funds = {
    summary, perFund, best: [...perFund].filter((f) => f.invested > 0).sort((a, z) => z.absReturnPct - a.absReturnPct)[0] || null, worst: [...perFund].filter((f) => f.invested > 0).sort((a, z) => a.absReturnPct - z.absReturnPct)[0] || null,
    largest: perFund[0] || null, sipMonthly: summary.monthlySipCommitment, activeSips: summary.activeSips,
    monthChange: mfBase == null ? null : { valueChange: round2(mfNow - mfBase), contributions, marketMovement: round2(mfNow - mfBase - contributions), baseDate: base.date },
    sipContributionChange: round2(contributions - prevContrib),
  }
  if (!data.funds.length) gaps.push('No mutual funds added.')

  // ---------- cards ----------
  const limit = data.cards.reduce((s, c) => s + c.limit, 0)
  const outstanding = data.cards.reduce((s, c) => s + c.outstanding, 0)
  const dues = upcomingCardDues(data.cards, t)
  const cardSpendMonth = round2(data.expenses.filter((e) => e.mode === 'card' && monthKey(e.date) === ym).reduce((s, e) => s + e.amount, 0))
  const cards = {
    limit, outstanding, utilisationPct: cardUtilisation(limit, outstanding), monthSpend: cardSpendMonth,
    perCard: data.cards.map((c) => ({ id: c.id, name: `${c.bank} ${c.cardName}`, limit: c.limit, outstanding: c.outstanding, utilisationPct: cardUtilisation(c.limit, c.outstanding), due: dues.find((d) => d.id === c.id) || null })).sort((a, z) => z.utilisationPct - a.utilisationPct),
    nextDue: dues[0] || null,
  }

  // ---------- insurance ----------
  const cover = coverageTotals(data.policies, t)
  const prem = upcomingPremiums(data.policies, t)
  const exp = expiringPolicies(data.policies, t)
  const healthPolicies = data.policies.filter((p) => p.type === 'health' && (!p.endDate || p.endDate >= iso))
  const insurance = {
    coverTotal: cover.total, byType: cover.byType, activeCount: cover.activeCount, annualPremium: round2(data.policies.reduce((s, p) => s + annualPremium(p), 0)),
    healthCover: round2(healthPolicies.reduce((s, p) => s + (Number(p.sumAssured) || 0), 0)), upcomingPremiums: prem.filter((p) => p.daysLeft <= 60), expiring: exp,
    coveredMembers: [...new Set(data.policies.flatMap((p) => p.members || []))],
    policies: data.policies.map((p) => ({ id: p.id, name: `${p.company} ${p.policyName}`, type: p.type, sumAssured: p.sumAssured, premium: p.premium, frequency: p.frequency, nextPremium: p.nextPremium, endDate: p.endDate, members: p.members || [] })),
  }

  // ---------- banks ----------
  const banks = { total: round2(data.bankAccounts.reduce((s, a) => s + a.currentBalance, 0)), accounts: data.bankAccounts.map((a) => ({ id: a.id, name: a.nickname || a.bankName, type: a.type, balance: a.currentBalance, mab: a.mab || 0 })) }

  // ---------- family (only what members chose to share; real circles live on the server) ----------
  let family = null
  const shared = (data.members || []).filter((m) => m.status === 'active')
  if (shared.length > 1) {
    const rows = shared.map((m) => ({ name: m.name, self: !!m.self, netWorth: m.self ? nw.netWorth : m.permissions?.netWorth && !m.permissions?.emergencyOnly ? m.summary?.netWorth ?? null : null, growthPct: m.self ? vsMonth?.pct ?? null : m.permissions?.netWorth ? m.summary?.growthPct ?? null : null }))
    const known = rows.filter((r) => r.netWorth != null)
    family = { members: rows, hidden: rows.length - known.length, total: round2(known.reduce((s, r) => s + r.netWorth, 0)), highest: [...known].sort((a, z) => z.netWorth - a.netWorth)[0] || null, note: 'Counts only members who chose to share their net worth. Joint assets are de-duplicated on the Family Circle page.' }
  } else gaps.push('No family members have shared data with you.')

  return { asOf: iso, ym, monthLabel: monthLabel(ym), netWorth, money, budget, funds, cards, insurance, banks, family, gaps, months: lastMonths(6, t) }
}
