// Income budgets: what you expect to receive in a month, in total and by category, set the way an expense budget is.
// Plans are kept as { 'YYYY-MM': { total, categories: { Salary: 80000, ... } } }. A month without a plan of its own uses the latest earlier one.
const num = (n) => Number(n) || 0

export function planFor(plans = {}, ym) {
  if (plans[ym]) return plans[ym]
  const earlier = Object.keys(plans).filter((k) => k < ym).sort().pop()
  return earlier ? plans[earlier] : null
}

/** Expected against received for one month. Received comes from the income entries of that month, by category. */
export function incomeProgress({ plan, bankTxns = [], ym }) {
  const got = {}
  for (const t of bankTxns) if (t.type === 'income' && String(t.date).slice(0, 7) === ym) { const c = t.category || 'Other'; got[c] = (got[c] || 0) + num(t.amount) }
  const received = Object.values(got).reduce((s, v) => s + v, 0)
  const cats = plan?.categories || {}
  const names = [...new Set([...Object.keys(cats).filter((c) => num(cats[c]) > 0), ...Object.keys(got)])]
  const rows = names.map((category) => {
    const expected = num(cats[category])
    return { category, expected, received: got[category] || 0, pct: expected > 0 ? Math.round(((got[category] || 0) / expected) * 100) : null }
  }).sort((a, b) => b.expected - a.expected || b.received - a.received)
  const expected = num(plan?.total)
  return { expected, received, pct: expected > 0 ? Math.round((received / expected) * 100) : null, rows }
}
