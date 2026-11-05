// Monthly financial report built from facts. The "summary" paragraph is assembled by deterministic rules from the
// same numbers shown in the sections, so it can never contradict them.
import { formatINR, formatPct } from '../wealth/format.js'
import { labelOf } from './insights.js'

const inr = (n) => formatINR(n)
const sgn = (n) => (n >= 0 ? '+' : '-')

export function buildReport(f, health, insights = []) {
  const nw = f.netWorth
  const b = f.budget
  const mf = f.funds
  const sections = []

  sections.push({ title: 'Net worth', rows: [
    ['Net worth', inr(nw.current)],
    ['Change vs last month', nw.vsLastMonth ? `${sgn(nw.vsLastMonth.diff)}${inr(Math.abs(nw.vsLastMonth.diff))}${nw.vsLastMonth.pct != null ? ` (${formatPct(nw.vsLastMonth.pct, 2)})` : ''} since ${nw.vsLastMonth.baseDate}` : 'Not enough history'],
    ['Total assets', inr(nw.assets)], ['Total liabilities', inr(nw.liabilities)],
  ] })
  sections.push({ title: 'Assets', rows: Object.entries(nw.assetBreakdown).filter(([, v]) => v > 0).map(([k, v]) => [labelOf(k), inr(v)]) })
  sections.push({ title: 'Liabilities', rows: Object.entries(nw.liabilityBreakdown).filter(([, v]) => v > 0).map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()), inr(v)]) })
  if (mf.summary.fundCount) sections.push({ title: 'Mutual fund performance (historical)', rows: [
    ['Invested', inr(mf.summary.invested)], ['Current value', inr(mf.summary.value)], ['Absolute return', `${sgn(mf.summary.absReturn)}${inr(Math.abs(mf.summary.absReturn))} (${formatPct(mf.summary.absReturnPct)})`], ['XIRR', mf.summary.xirrPct == null ? 'Not available' : formatPct(mf.summary.xirrPct, 1)],
    ...mf.perFund.map((x) => [x.name, `${inr(x.value)} · ${formatPct(x.absReturnPct)}`]),
  ] })
  sections.push({ title: 'Budget performance', rows: b ? [
    ['Monthly budget', inr(b.total)], ['Spent so far', `${inr(b.spent)} (${b.utilisationPct}%)`], ['Expected by today', inr(b.expectedTillToday)], ['Deviation', `${b.variance >= 0 ? 'Over pace by' : 'Under pace by'} ${inr(Math.abs(b.variance))}`], ['Month-end forecast (estimate)', inr(b.projected)], ['Status', b.status === 'over' ? 'Ahead of pace' : 'Within pace'],
  ] : [['Budget', `No budget set for ${f.monthLabel}`]] })
  sections.push({ title: 'Spending analysis', rows: [['Income', inr(f.money.thisMonth.income)], ['Expenses', inr(f.money.thisMonth.expense)], ...f.money.topExpenseCategories.map((c) => [c.name, `${inr(c.value)} (${c.pct}%)`])] })
  sections.push({ title: 'Credit cards', rows: f.cards.perCard.length ? [['Total outstanding', inr(f.cards.outstanding)], ['Utilisation', `${f.cards.utilisationPct}%`], ['Card spending this month', inr(f.cards.monthSpend)]] : [['Cards', 'None added']] })
  const upcoming = [...(f.cards.nextDue ? [[f.cards.nextDue.title, `${inr(f.cards.nextDue.amount)} due ${f.cards.nextDue.date}`]] : []), ...f.insurance.upcomingPremiums.slice(0, 4).map((p) => [p.title, `${inr(p.amount)} on ${p.date}`])]
  sections.push({ title: 'Upcoming payments', rows: upcoming.length ? upcoming : [['Nothing due soon', '']] })
  const reminders = insights.filter((i) => i.severity !== 'low').slice(0, 5)
  sections.push({ title: 'Important reminders', rows: reminders.length ? reminders.map((i) => [i.module, i.text]) : [['All clear', '']] })

  // ---- deterministic summary ----
  const parts = []
  if (nw.vsLastMonth) {
    const top = nw.contributors[0]
    parts.push(`Your net worth ${nw.vsLastMonth.diff >= 0 ? 'increased' : 'decreased'} by ${inr(Math.abs(nw.vsLastMonth.diff))} since ${nw.vsLastMonth.baseDate}${top && Math.abs(top.diff) > 0 ? `, mainly because of a ${top.diff >= 0 ? 'rise' : 'fall'} in ${labelOf(top.key)}` : ''}.`)
  }
  if (b) parts.push(b.status === 'over' ? `Spending is ${inr(b.variance)} ahead of your planned pace and may reach about ${inr(b.projected)} by month end (estimate).` : `Spending is within your planned pace.`)
  if (f.money.topExpenseCategories[0]) parts.push(`Your largest expense category is ${f.money.topExpenseCategories[0].name}.`)
  if (f.cards.limit > 0 && f.cards.utilisationPct >= 70) parts.push(`Credit card utilisation is high at ${f.cards.utilisationPct}%.`)
  const actions = [...(health.actions || []).slice(0, 3), ...(b && b.status === 'over' ? [`Try to keep spending near ${inr(b.safeDailySpend)} a day for the rest of ${b.label}.`] : [])]

  return {
    title: `Your financial summary: ${f.monthLabel}`, period: f.monthLabel, asOf: f.asOf, partial: f.budget ? f.budget.remainingDays > 1 : true,
    headline: [['Net worth', inr(nw.current)], ['Assets', inr(nw.assets)], ['Liabilities', inr(nw.liabilities)], ['Mutual funds', inr(nw.assetBreakdown.mutualFunds || 0)], ['Expenses', inr(f.money.thisMonth.expense)], ['Budget', b ? inr(b.total) : 'Not set']],
    summary: parts.join(' '), sections, actions, healthScore: health.score, source: 'Generated from your data by built-in rules',
  }
}

export function reportToText(r) {
  const lines = [r.title.toUpperCase(), `Data as of ${r.asOf}${r.partial ? ' (month in progress)' : ''}`, '', ...r.headline.map(([k, v]) => `${k}: ${v}`), '', 'Summary', r.summary, '']
  for (const s of r.sections) lines.push(s.title, ...s.rows.map(([k, v]) => (v ? `  ${k}: ${v}` : `  ${k}`)), '')
  if (r.actions.length) lines.push('Suggested actions', ...r.actions.map((a) => `  - ${a}`), '')
  lines.push(r.source, 'Educational summary only; not financial advice.')
  return lines.join('\n')
}
