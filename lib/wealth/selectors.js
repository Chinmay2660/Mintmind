// Derived series used by several screens.
import { addMonths, toISO, parseDate, round2 } from './calc.js'

export const monthKey = (iso) => String(iso).slice(0, 7)
export const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
}

/** Last `n` month keys ending at current month. */
export function lastMonths(n, today = new Date()) {
  const first = toISO(today).slice(0, 8) + '01'
  return Array.from({ length: n }, (_, i) => monthKey(addMonths(first, -(n - 1 - i))))
}

/**
 * Income vs expenses per month.
 * Income = bank `income` entries. Transfers are excluded, card repayments are never expenses.
 */
export function incomeVsExpenses(bankTxns, expenses, n = 6, today = new Date()) {
  const keys = lastMonths(n, today)
  const map = Object.fromEntries(keys.map((k) => [k, { month: monthLabel(k), key: k, income: 0, expenses: 0 }]))
  for (const t of bankTxns) if (t.type === 'income' && map[monthKey(t.date)]) map[monthKey(t.date)].income += Number(t.amount) || 0
  for (const e of expenses) if (map[monthKey(e.date)]) map[monthKey(e.date)].expenses += Number(e.amount) || 0
  return keys.map((k) => ({ ...map[k], income: round2(map[k].income), expenses: round2(map[k].expenses) }))
}

export function monthTotal(expenses, ym) {
  return round2(expenses.filter((e) => monthKey(e.date) === ym).reduce((s, e) => s + (Number(e.amount) || 0), 0))
}

export function categoryTotals(expenses, ym) {
  const out = {}
  for (const e of expenses) if (monthKey(e.date) === ym) out[e.category] = (out[e.category] || 0) + (Number(e.amount) || 0)
  return out
}

/** Active sum insured of policies (coverage — never an asset). */
export function coverageTotals(policies, today = new Date()) {
  const t = toISO(today)
  const active = policies.filter((p) => !p.endDate || p.endDate >= t)
  const byType = {}
  for (const p of active) byType[p.type] = (byType[p.type] || 0) + (Number(p.sumAssured) || 0)
  return { total: Object.values(byType).reduce((a, b) => a + b, 0), byType, activeCount: active.length }
}

export function annualPremium(p) {
  const n = { monthly: 12, quarterly: 4, half_yearly: 2, yearly: 1, single: 0 }[p.frequency] ?? 1
  return (Number(p.premium) || 0) * n
}

export const daysUntil = (iso, today = new Date()) => Math.round((parseDate(iso) - parseDate(today)) / 86400000)
