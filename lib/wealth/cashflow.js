const monthsBack = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 - n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

/**
 * Money in against money out for each of the last `months` months ending at `endYm`, from the transaction feed
 * (buildTransactions). Transfers between your own accounts are not income or spending and are left out.
 * Also where the income came from and where the spending went over that whole span.
 */
export function cashFlow(list = [], endYm, months = 6) {
  const yms = Array.from({ length: months }, (_, i) => monthsBack(endYm, months - 1 - i))
  const row = Object.fromEntries(yms.map((m) => [m, { ym: m, income: 0, expense: 0 }]))
  const inBy = {}, outBy = {}
  for (const t of list) {
    const m = String(t.date).slice(0, 7)
    if (!row[m] || (t.kind !== 'income' && t.kind !== 'expense')) continue
    const amt = Number(t.amount) || 0
    if (t.kind === 'income') { row[m].income += amt; inBy[t.category || 'Other'] = (inBy[t.category || 'Other'] || 0) + amt }
    else { row[m].expense += amt; outBy[t.category || 'Other'] = (outBy[t.category || 'Other'] || 0) + amt }
  }
  const series = yms.map((m) => { const r = row[m]; const net = Math.round(r.income - r.expense); return { ...r, net, savingsRate: r.income > 0 ? Math.round((net / r.income) * 100) : null } })
  const totalIn = series.reduce((s, r) => s + r.income, 0), totalOut = series.reduce((s, r) => s + r.expense, 0)
  const rank = (o, total) => Object.entries(o).map(([category, value]) => ({ category, value: Math.round(value), pct: total ? Math.round((value / total) * 1000) / 10 : 0 })).sort((a, b) => b.value - a.value)
  const withData = series.filter((r) => r.income > 0 || r.expense > 0).length
  return {
    series, totalIn: Math.round(totalIn), totalOut: Math.round(totalOut), net: Math.round(totalIn - totalOut),
    avgNet: withData ? Math.round((totalIn - totalOut) / withData) : 0,
    sources: rank(inBy, totalIn), uses: rank(outBy, totalOut),
  }
}
