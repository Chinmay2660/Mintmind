import { categoryTotals } from './selectors.js'
import { childOf, parentOf } from './subcategories.js'

const r0 = (n) => Math.round(n)
const prevMonth = (ym) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

/**
 * One row per category, in the style of a money manager app: the limit, what is spent, what is left, and how much
 * could be spent by today if the limit were spread evenly over the days of the month ("allowedToDate").
 * Also the change in spending against the previous month.
 *   status: 'none' (no limit set), 'under' (at or below today's pace), 'over' (ahead of pace), 'exceeded' (past the limit)
 */
export function budgetRows({ budget, prevBudget = null, expenses = [], ym, today = new Date() }) {
  const [y, m] = ym.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const nowYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const dayToday = ym === nowYm ? today.getDate() : ym < nowYm ? days : 0
  const spentBy = categoryTotals(expenses, ym)
  const prevBy = categoryTotals(expenses, prevMonth(ym))
  const baseLimits = budget?.categories || {}
  // Rollover is per category: only the ones in rolloverCats carry last month's unspent amount into this month's limit.
  const prevSpentBy = categoryTotals(expenses, prevMonth(ym))
  const carryOf = (c) => ((budget?.rolloverCats || []).includes(c) && Number(prevBudget?.categories?.[c]) > 0 ? Math.max(0, Math.round(Number(prevBudget.categories[c]) - (Number(prevSpentBy[c]) || 0))) : 0)
  const limits = Object.fromEntries(Object.keys(baseLimits).map((c) => [c, (Number(baseLimits[c]) || 0) + carryOf(c)]))
  const names = [...new Set([...Object.keys(limits).filter((c) => Number(limits[c]) > 0), ...Object.keys(spentBy)])]

  // A budget can run for a quarter or a year (a holiday fund, say). Its limit is for the whole period and spending counts
  // from the start of the quarter or year to the end of this month, so the pace line spreads it over the period's days.
  const pad2 = (n) => String(n).padStart(2, '0')
  const periodOf = (c) => {
    const p = budget?.periods?.[c]
    if (p !== 'quarterly' && p !== 'yearly') return null
    const first = p === 'yearly' ? 1 : Math.floor((m - 1) / 3) * 3 + 1
    const last = p === 'yearly' ? 12 : first + 2
    let totalDays = 0, before = 0, spent = 0
    for (let mm = first; mm <= last; mm++) {
      const d = new Date(y, mm, 0).getDate()
      totalDays += d
      if (mm < m) before += d
      if (mm <= m) spent += Number(categoryTotals(expenses, `${y}-${pad2(mm)}`)[c]) || 0
    }
    return { p, totalDays, elapsed: dayToday > 0 || ym < nowYm ? before + dayToday : 0, spent }
  }

  const build = (category, limit, spent, prevSpent, per = null, monthSpent = spent) => {
    const span = per ? per.totalDays : days
    const allowedToDate = r0((limit / span) * (per ? per.elapsed : dayToday))
    const remaining = r0(limit - spent)
    const status = !(limit > 0) ? 'none' : spent > limit ? 'exceeded' : spent > allowedToDate ? 'over' : 'under'
    const change = r0(monthSpent - prevSpent)
    return {
      category, limit, spent: r0(spent), remaining, allowedToDate,
      // how much more can be spent today and still be on pace (never negative)
      canSpendNow: Math.max(0, allowedToDate - r0(spent)),
      usedPct: limit > 0 ? Math.round((spent / limit) * 100) : null,
      pacePct: limit > 0 ? Math.round((allowedToDate / limit) * 100) : null,
      status, period: per ? per.p : 'monthly', monthSpent: r0(monthSpent), prevSpent: r0(prevSpent), change, changePct: prevSpent > 0 ? Math.round((change / prevSpent) * 1000) / 10 : null,
    }
  }
  const leaf = (c) => { const per = periodOf(c); const mo = Number(spentBy[c]) || 0; return { ...build(c, Number(limits[c]) || 0, per ? per.spent : mo, Number(prevBy[c]) || 0, per, mo), carry: carryOf(c) } }
  // top level categories carry their sub categories: spent adds up, and the limit is the parent's own, else the sum of the children's
  const tops = [...new Set(names.map(parentOf))]
  const rows = tops.map((p) => {
    const kids = names.filter((c) => childOf(c) && parentOf(c) === p)
    if (!kids.length || periodOf(p) || kids.some(periodOf)) return leaf(p)
    const members = [p, ...kids]
    const sum = (o) => members.reduce((n, c) => n + (Number(o[c]) || 0), 0)
    const own = Number(limits[p]) || 0
    const limit = own > 0 ? own : kids.reduce((n, c) => n + (Number(limits[c]) || 0), 0)
    return { ...build(p, limit, sum(spentBy), sum(prevBy)), children: kids.map(leaf).sort((a, b) => b.spent - a.spent) }
  }).sort((a, b) => (b.limit > 0) - (a.limit > 0) || b.spent - a.spent)
  const totalSpent = Object.values(spentBy).reduce((s, v) => s + (Number(v) || 0), 0)
  const prevTotal = Object.values(prevBy).reduce((s, v) => s + (Number(v) || 0), 0)
  const total = build('All categories', Number(budget?.total) || 0, totalSpent, prevTotal)
  return { rows, total, days, dayToday }
}
