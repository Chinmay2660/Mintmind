// Habits worth noticing, worked out only from what is on the device. Nothing is awarded for opening the app or for spending.
const ym = (d) => String(d).slice(0, 7)
const prevYm = (m) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const sumBy = (rows, m, f = (r) => r.amount) => rows.filter((r) => ym(r.date) === m).reduce((s, r) => s + (Number(f(r)) || 0), 0)

export const FAMILIES = [
  { id: 'under-budget', title: 'Under budget', unit: 'months in a row', tiers: [1, 3, 6, 12], about: 'Whole months where you spent no more than your monthly budget.' },
  { id: 'saver', title: 'Kept 20% of income', unit: 'months in a row', tiers: [1, 3, 6, 12], about: 'Whole months where income minus spending was at least a fifth of income.' },
  { id: 'tracking', title: 'Tracked net worth', unit: 'months in a row', tiers: [3, 6, 12], about: 'Months in a row with a saved net worth, counting this one.' },
  { id: 'rising', title: 'Net worth rising', unit: 'months in a row', tiers: [2, 3, 6], about: 'Saved months where net worth was higher than the month before.' },
  { id: 'goals', title: 'Goals reached', unit: 'goals', tiers: [1, 3, 5], about: 'Goals whose linked money has reached the target.' },
  { id: 'cover', title: 'Emergency cover', unit: 'months of spending', tiers: [1, 3, 6], about: 'Bank and cash balances divided by your average monthly spending over the last three whole months.' },
]

/**
 * current: the number each family counts. earned: the tiers reached. next: the next tier and how far along (null once the top is reached).
 *   expenses [{date, amount}], bankTxns [{date, type, amount}], budgets [{id: 'YYYY-MM', total}], snapshots [{id, netWorth}],
 *   goalsAchieved: number, liquid: bank and cash total.
 */
export function achievements({ expenses = [], bankTxns = [], budgets = [], snapshots = [], goalsAchieved = 0, liquid = 0, today = new Date() }) {
  const now = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const last = prevYm(now)
  const income = bankTxns.filter((t) => t.type === 'income')

  const run = (start, ok, limit = 600) => { let n = 0, m = start; while (n < limit && ok(m)) { n++; m = prevYm(m) } return n }

  const underBudget = run(last, (m) => { const b = budgets.find((x) => x.id === m); return !!b && Number(b.total) > 0 && sumBy(expenses, m) <= Number(b.total) })
  const saver = run(last, (m) => { const i = sumBy(income, m); return i > 0 && (i - sumBy(expenses, m)) / i >= 0.2 })
  const snapIds = new Set(snapshots.map((s) => s.id))
  const tracking = run(now, (m) => snapIds.has(m))
  const nwOf = (m) => snapshots.find((s) => s.id === m)?.netWorth
  // newest saved month first; count how many in a row are higher than the saved month before
  const ids = [...snapIds].sort().reverse()
  let rising = 0
  for (let i = 0; i < ids.length - 1; i++) { if (nwOf(ids[i]) > nwOf(ids[i + 1])) rising++; else break }
  const spend3 = [last, prevYm(last), prevYm(prevYm(last))].map((m) => sumBy(expenses, m))
  const avgSpend = spend3.reduce((a, b) => a + b, 0) / 3
  const cover = avgSpend > 0 ? Math.floor((liquid / avgSpend) * 10) / 10 : 0

  const current = { 'under-budget': underBudget, saver, tracking, rising, goals: goalsAchieved, cover }
  return FAMILIES.map((f) => {
    const cur = current[f.id] ?? 0
    const next = f.tiers.find((t) => cur < t) ?? null
    return { ...f, current: cur, earned: f.tiers.filter((t) => cur >= t), next: next == null ? null : { tier: next, have: cur, pct: Math.round((cur / next) * 100) } }
  })
}
