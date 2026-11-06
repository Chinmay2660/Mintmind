// Unusual spending detector (deterministic): unusually large single expenses and likely duplicate charges.
const DAY = 86400000
const dateMs = (s) => new Date(`${s}T00:00:00`).getTime()
const median = (xs) => { const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2 }

/** expenses: [{ id, date, amount, category, note }]. Looks at the last `days` days against the 150 days before. */
export function unusualSpending(expenses, today = new Date(), { days = 30, minAmount = 1500, factor = 3 } = {}) {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const recent = expenses.filter((e) => { const d = (t0 - dateMs(e.date)) / DAY; return d >= 0 && d < days })
  const older = expenses.filter((e) => { const d = (t0 - dateMs(e.date)) / DAY; return d >= days && d < days + 150 })
  const out = []
  for (const e of recent) {
    const hist = older.filter((o) => o.category === e.category).map((o) => o.amount)
    if (hist.length < 4) continue
    const m = median(hist)
    if (e.amount >= Math.max(minAmount, factor * m)) out.push({ id: e.id, kind: 'large', date: e.date, amount: e.amount, category: e.category, note: e.note || '', typical: Math.round(m), times: Math.round((e.amount / m) * 10) / 10 })
  }
  const seen = new Map()
  for (const e of recent) { const k = `${e.date}|${e.amount}|${e.category}`; seen.set(k, [...(seen.get(k) || []), e]) }
  for (const g of seen.values()) if (g.length > 1 && g[0].amount >= 200) out.push({ id: g[0].id, kind: 'duplicate', date: g[0].date, amount: g[0].amount, category: g[0].category, note: g[0].note || '', count: g.length })
  return out.sort((a, b) => b.date.localeCompare(a.date))
}
