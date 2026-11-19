import { expenseParts } from './splits.js'

const ym = (d) => String(d).slice(0, 7)
const prevYm = (m) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const nextYm = (m) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const r0 = (n) => Math.round(n)

/**
 * The average money in and out per month over the last `n` whole months that have any record. Months with nothing recorded are
 * skipped, so a new account is not averaged against empty months. Returns zeros when there is no history.
 */
export function monthlyAverages({ expenses = [], bankTxns = [], today = new Date(), n = 3 }) {
  const now = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  // spending and income are averaged separately, each over its own recent months that have a record
  const avg = (valueOf) => {
    const vals = []
    let m = prevYm(now)
    for (let i = 0; i < 12 && vals.length < n; i++, m = prevYm(m)) { const v = valueOf(m); if (v > 0) vals.push(v) }
    return { value: vals.length ? r0(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, months: vals.length }
  }
  const spend = avg((m) => expenses.filter((e) => ym(e.date) === m).reduce((s, e) => s + expenseParts(e).reduce((x, p) => x + p.amount, 0), 0))
  const inc = avg((m) => bankTxns.filter((t) => t.type === 'income' && ym(t.date) === m).reduce((s, t) => s + (Number(t.amount) || 0), 0))
  return { income: inc.value, spend: spend.value, months: Math.max(spend.months, inc.months) }
}

/** Month by month cash if the next months look like the recent average. The first month is the one after today's. */
export function cashForecast({ cash = 0, income = 0, spend = 0, months = 6, today = new Date() }) {
  let m = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  let bal = cash
  const points = []
  for (let i = 0; i < months; i++) {
    m = nextYm(m)
    const start = bal
    bal = bal + income - spend
    points.push({ ym: m, start: r0(start), income: r0(income), spend: r0(spend), end: r0(bal) })
  }
  const low = points.reduce((a, b) => (b.end < a.end ? b : a), points[0])
  return { points, net: r0(income - spend), lowest: low, runsOut: points.find((p) => p.end < 0) || null }
}

/**
 * For each goal still open: how much is left, the monthly amount that would reach it by its date, and, if the saving you do
 * today were shared equally between the open goals, when each would be reached. A rough picture, not a promise.
 *   goals: [{ id, name, remaining, monthsLeft }]
 */
export function goalForecast(goals = [], monthlySaving = 0) {
  const open = goals.filter((g) => g.remaining > 0)
  const share = open.length ? Math.max(0, monthlySaving) / open.length : 0
  return open.map((g) => {
    const monthsToReach = share > 0 ? Math.ceil(g.remaining / share) : null
    const neededMonthly = g.monthsLeft != null && g.monthsLeft > 0 ? r0(g.remaining / g.monthsLeft) : null
    const onTrack = g.monthsLeft == null ? null : monthsToReach != null && monthsToReach <= g.monthsLeft
    return { id: g.id, name: g.name, remaining: r0(g.remaining), monthsLeft: g.monthsLeft, neededMonthly, share: r0(share), monthsToReach, onTrack }
  })
}
