// One chronological feed of money movements for the Budget & Expenses views (list, calendar, stats).
// expense  : spending (shrinks a bank/cash balance or grows card outstanding)
// income   : money received into an account
// transfer : money moved between your own accounts / cards (never income or spending)
import { round2 } from './calc.js'

const name = (a) => (a ? a.nickname || a.bankName || a.cardName || 'Account' : 'Account')

export function buildTransactions({ expenses = [], bankTxns = [], transfers = [], bankAccounts = [], cards = [] }) {
  const acc = new Map(bankAccounts.map((a) => [a.id, a]))
  const card = new Map(cards.map((c) => [c.id, c]))
  const ref = (type, id) => (type === 'card' ? (card.get(id) ? `${card.get(id).bank} ${card.get(id).cardName}` : 'Card') : name(acc.get(id)))
  const out = []

  for (const e of expenses) {
    out.push({ key: `e:${e.id}`, kind: 'expense', id: e.id, date: e.date, amount: Number(e.amount) || 0, category: e.category, title: e.note || e.category, sub: e.category, mode: e.mode, raw: e })
  }
  for (const t of bankTxns) {
    if (t.type === 'income') {
      out.push({ key: `i:${t.id}`, kind: 'income', id: t.id, date: t.date, amount: Number(t.amount) || 0, category: t.category || 'Other', title: t.description || t.category || 'Income', sub: `${t.category || 'Income'} · ${name(acc.get(t.accountId))}`, raw: t })
    } else if (t.type === 'transfer') {
      // transfers recorded before the transfers table existed
      out.push({ key: `lt:${t.id}`, kind: 'transfer', id: t.id, date: t.date, amount: Number(t.amount) || 0, category: 'Transfer', title: t.description || 'Transfer', sub: `${name(acc.get(t.accountId))} → ${t.toAccountId ? name(acc.get(t.toAccountId)) : 'External'}`, legacy: true, raw: t })
    }
  }
  for (const t of transfers) {
    out.push({ key: `t:${t.id}`, kind: 'transfer', id: t.id, date: t.date, amount: Number(t.amount) || 0, category: 'Transfer', title: t.note || (t.toType === 'card' ? 'Card payment' : 'Transfer'), sub: `${ref(t.fromType, t.fromId)} → ${ref(t.toType, t.toId)}`, raw: t })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1))
}

export const inMonth = (list, ym) => list.filter((t) => String(t.date).slice(0, 7) === ym)

export function monthSummary(list) {
  let income = 0
  let expense = 0
  let transfer = 0
  for (const t of list) {
    if (t.kind === 'income') income += t.amount
    else if (t.kind === 'expense') expense += t.amount
    else transfer += t.amount
  }
  return { income: round2(income), expense: round2(expense), transfer: round2(transfer), net: round2(income - expense) }
}

/** day -> { income, expense } for calendar cells. Transfers are excluded. */
export function dailyTotals(list) {
  const out = {}
  for (const t of list) {
    if (t.kind === 'transfer') continue
    const d = String(t.date)
    out[d] = out[d] || { income: 0, expense: 0 }
    out[d][t.kind] += t.amount
  }
  return out
}

export function groupByDay(list) {
  const map = new Map()
  for (const t of list) {
    if (!map.has(t.date)) map.set(t.date, [])
    map.get(t.date).push(t)
  }
  return [...map.entries()].map(([date, items]) => ({ date, items, ...monthSummary(items) }))
}

export function categoryBreakdown(list, kind) {
  const m = {}
  let total = 0
  for (const t of list) {
    if (t.kind !== kind) continue
    m[t.category] = (m[t.category] || 0) + t.amount
    total += t.amount
  }
  return Object.entries(m).map(([name, value]) => ({ name, value: round2(value), pct: total ? round2((value / total) * 100) : 0 })).sort((a, b) => b.value - a.value)
}
