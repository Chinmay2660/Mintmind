// Insights generated from facts. Each one states its data period and whether it is a fact, an estimate or a suggestion.
// Ids include the period, so a dismissed insight stays dismissed for that period but can return when facts change.
import { formatDate, formatINR, formatPct } from '../wealth/format.js'

const inr = (n) => formatINR(Math.abs(n))
const sevRank = { high: 0, medium: 1, low: 2 }

export function buildInsights(f) {
  const out = []
  const add = (i) => out.push({ kind: 'fact', severity: 'low', ...i, id: `${i.key}@${i.period}` })
  const nw = f.netWorth

  // ---- net worth ----
  if (nw.vsLastMonth) {
    const d = nw.vsLastMonth
    const top = nw.contributors[0]
    const why = top && Math.abs(top.diff) >= Math.abs(d.diff) * 0.3 ? `, mainly due to ${top.diff >= 0 ? 'an increase' : 'a decrease'} in ${labelOf(top.key)}` : ''
    add({ key: 'nw-month', module: 'Net Worth', period: `since ${formatDate(d.baseDate)}`, text: `Your net worth ${d.diff >= 0 ? 'increased' : 'decreased'} by ${inr(d.diff)}${d.pct != null ? ` (${formatPct(d.pct, 1)})` : ''} compared with ${formatDate(d.baseDate)}${why}.`, href: '/dashboard/net-worth', severity: d.diff < 0 ? 'medium' : 'low' })
  }
  if (nw.liabilityChange != null && nw.liabilityChange !== 0) add({ key: 'liab-month', module: 'Net Worth', period: `since ${formatDate(nw.vsLastMonth.baseDate)}`, text: `Your liabilities ${nw.liabilityChange < 0 ? 'decreased' : 'increased'} by ${inr(nw.liabilityChange)} compared with ${formatDate(nw.vsLastMonth.baseDate)}.`, href: '/dashboard/net-worth', severity: nw.liabilityChange > 0 ? 'medium' : 'low' })
  if (nw.vsLastYear?.pct != null) add({ key: 'nw-year', module: 'Net Worth', period: `since ${formatDate(nw.vsLastYear.baseDate)}`, text: `Your net worth has ${nw.vsLastYear.diff >= 0 ? 'grown' : 'fallen'} by ${formatPct(Math.abs(nw.vsLastYear.pct), 1)} over the last 12 months (since ${formatDate(nw.vsLastYear.baseDate)}).`, href: '/dashboard/net-worth' })

  // ---- budget ----
  const b = f.budget
  if (b && b.dayToday > 0) {
    if (b.status === 'over' && b.variance > 0) {
      add({ key: 'budget-pace', module: 'Budget', period: `${b.label}, day ${b.dayToday}`, severity: b.utilisationPct >= 90 ? 'high' : 'medium', text: `You have spent ${b.utilisationPct}% of your ${b.label} budget but only ${b.monthPassedPct}% of the month has passed. You are ${inr(b.variance)} faster than your planned pace.`, href: '/dashboard/budget' })
      if (b.projectedOver > 0) add({ key: 'budget-forecast', module: 'Budget', kind: 'estimate', period: `${b.label}, day ${b.dayToday}`, severity: 'medium', text: `At your current pace you may spend about ${inr(b.projected)} this month, which is ${inr(b.projectedOver)} over budget (estimate based on spending so far).`, href: '/dashboard/budget' })
    } else if (b.status === 'under') {
      add({ key: 'budget-ok', module: 'Budget', period: `${b.label}, day ${b.dayToday}`, text: `You are ${inr(b.variance)} under your planned pace so far (${b.utilisationPct}% of the budget used, ${b.monthPassedPct}% of the month passed).`, href: '/dashboard/budget' })
    }
    for (const c of b.categories.filter((c) => c.prevSpent > 0 && c.changeVsPrevPct != null && c.changeVsPrevPct >= 20 && c.spent - c.prevSpent >= 1000).slice(0, 2)) {
      add({ key: `cat-up-${c.name}`, module: 'Budget', period: `${b.label} vs previous month`, severity: 'medium', text: `Your ${c.name} spending is ${formatPct(c.changeVsPrevPct, 0).replace('+', '')} higher than last month (${inr(c.spent)} vs ${inr(c.prevSpent)}).`, href: '/dashboard/budget' })
    }
    for (const c of b.categories.filter((c) => c.limit > 0 && c.spent > c.limit)) add({ key: `cat-over-${c.name}`, module: 'Budget', period: b.label, severity: 'medium', text: `${c.name} is over its category budget (${inr(c.spent)} of ${inr(c.limit)}).`, href: '/dashboard/budget' })
  }

  // ---- investments ----
  const mf = f.funds
  if (mf.summary.fundCount > 0) {
    add({ key: 'mf-value', module: 'Mutual Funds', period: `as of ${f.asOf} (latest NAVs you entered)`, text: `Your mutual fund portfolio is worth ${inr(mf.summary.value)} against ${inr(mf.summary.invested)} invested, an absolute ${mf.summary.absReturn >= 0 ? 'gain' : 'loss'} of ${inr(mf.summary.absReturn)}.`, href: '/dashboard/mutual-funds' })
    if (mf.sipContributionChange !== 0) add({ key: 'sip-change', module: 'Mutual Funds', period: f.monthLabel, text: `Your investments this month are ${inr(mf.sipContributionChange)} ${mf.sipContributionChange > 0 ? 'higher' : 'lower'} than last month.`, href: '/dashboard/mutual-funds' })
    if (mf.largest && mf.largest.sharePct >= 40 && mf.summary.fundCount > 1) add({ key: 'mf-concentration', module: 'Mutual Funds', kind: 'suggestion', period: `as of ${f.asOf}`, text: `${mf.largest.name} makes up ${mf.largest.sharePct}% of your mutual fund portfolio. You may want to review how concentrated your holdings are. This is an observation, not a recommendation to buy or sell.`, href: '/dashboard/mutual-funds' })
    const stale = mf.perFund.filter((x) => x.navDate && x.navSource !== 'kite' && daysAgo(x.navDate, f.asOf) > 7)
    if (stale.length) add({ key: 'nav-stale', module: 'Mutual Funds', kind: 'suggestion', period: f.monthLabel, text: `${stale.length} fund NAV${stale.length > 1 ? 's are' : ' is'} over a week old, so your portfolio value may be out of date. Update NAVs for accurate figures.`, href: '/dashboard/mutual-funds' })
  }

  // ---- cards ----
  if (f.cards.limit > 0 && f.cards.utilisationPct >= 70) add({ key: 'card-util', module: 'Cards', kind: 'suggestion', period: f.asOf, severity: 'high', text: `Your overall credit card utilisation is ${f.cards.utilisationPct}%. Keeping it lower is generally better for your credit profile.`, href: '/dashboard/credit-cards' })
  for (const c of f.cards.perCard.filter((c) => c.due && c.due.daysLeft <= 7)) add({ key: `card-due-${c.id}`, module: 'Cards', period: c.due.date, severity: c.due.daysLeft <= 3 ? 'high' : 'medium', text: `${c.name} payment of ${inr(c.outstanding)} is due ${c.due.daysLeft === 0 ? 'today' : `in ${c.due.daysLeft} day${c.due.daysLeft > 1 ? 's' : ''}`} (${formatDate(c.due.date)}).`, href: '/dashboard/credit-cards' })

  // ---- insurance ----
  for (const p of f.insurance.upcomingPremiums.filter((p) => p.daysLeft <= 30)) add({ key: `prem-${p.id}`, module: 'Insurance', period: p.date, severity: p.daysLeft <= 7 ? 'high' : 'medium', text: `${p.title} premium of ${inr(p.amount)} is due ${p.daysLeft < 0 ? `${-p.daysLeft} days ago` : p.daysLeft === 0 ? 'today' : `in ${p.daysLeft} days`} (${formatDate(p.date)}).`, href: '/dashboard/insurance' })
  for (const p of f.insurance.expiring) add({ key: `exp-${p.id}`, module: 'Insurance', period: p.date, severity: p.daysLeft <= 15 ? 'high' : 'medium', text: `${p.title} on ${formatDate(p.date)} (in ${p.daysLeft} days). Plan its renewal.`, href: '/dashboard/insurance' })

  // ---- banks ----
  for (const a of f.banks.accounts.filter((a) => a.mab > 0 && a.balance < a.mab)) add({ key: `mab-${a.id}`, module: 'Bank Accounts', period: f.asOf, severity: 'high', text: `${a.name} is ${inr(a.mab - a.balance)} below its minimum balance of ${inr(a.mab)}.`, href: `/dashboard/bank-accounts/${a.id}` })

  return out.sort((a, z) => sevRank[a.severity] - sevRank[z.severity])
}

const LABELS = { bank: 'bank and cash balances', mutualFunds: 'your mutual fund portfolio', stocks: 'stocks', epf: 'EPF', ppf: 'PPF', nps: 'NPS', fd: 'fixed deposits', realEstate: 'real estate', gold: 'gold', other: 'other assets' }
export const labelOf = (k) => LABELS[k] || k
const daysAgo = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)

/** Dedupe + hide dismissed insights. `dismissed` = { [id]: timestamp }. */
export function visibleInsights(list, dismissed = {}) {
  const seen = new Set()
  return list.filter((i) => !dismissed[i.id] && !seen.has(i.id) && seen.add(i.id))
}

/** The four items of the dashboard widget: one insight, one spending observation, one reminder, one action. */
export function widgetPicks(f, insights) {
  const money = insights.find((i) => ['Net Worth', 'Mutual Funds'].includes(i.module)) || insights[0] || null
  const spending = insights.find((i) => i.module === 'Budget') || null
  const reminder = insights.find((i) => ['Cards', 'Insurance', 'Bank Accounts'].includes(i.module)) || null
  const action = f.budget && f.budget.dayToday > 0 && f.budget.status === 'over' ? { text: `Try to keep spending near ${inr(f.budget.safeDailySpend)} a day for the rest of ${f.budget.label} to stay within budget.`, href: '/dashboard/budget' } : f.cards.limit > 0 && f.cards.utilisationPct >= 70 ? { text: 'Consider paying down card balances to bring utilisation under 30%.', href: '/dashboard/credit-cards' } : f.gaps[0] ? { text: f.gaps[0], href: '/dashboard' } : null
  return { money, spending, reminder, action }
}
