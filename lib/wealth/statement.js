import { assetValue } from './holdings.js'
import { ASSET_LABELS, LIABILITY_LABELS } from './labels.js'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const r0 = (n) => Math.round(n)

/**
 * Everything a net worth statement lists, as sections of rows. Totals are the sum of the rows, so the page always adds up.
 * Account numbers and card numbers are never included: only the name the person gave and the amount.
 *   detailed false: one row per kind (Bank balances, Mutual funds, Fixed deposits...). true: one row per account, fund or holding.
 */
export function buildStatement({ bankAccounts = [], funds = [], assets = [], liabilities = [], cards = [], detailed = true, today = new Date() }) {
  const assetRows = []
  const add = (label, group, value) => { if (r0(value) !== 0) assetRows.push({ group, label, value: r0(value) }) }
  for (const a of bankAccounts) add(a.nickname || a.bankName || 'Bank account', a.type === 'cash' ? 'Cash' : 'Bank balances', num(a.currentBalance))
  for (const f of funds) add(f.name || 'Mutual fund', 'Mutual funds', num(f.currentValue))
  for (const a of assets) add(a.name || ASSET_LABELS[a.category] || 'Asset', ASSET_LABELS[a.category] || 'Other assets', assetValue(a, today))

  const liabRows = []
  const addL = (label, group, value) => { if (r0(value) > 0) liabRows.push({ group, label, value: r0(value) }) }
  for (const l of liabilities) addL(l.name || LIABILITY_LABELS[l.category] || 'Loan', LIABILITY_LABELS[l.category] || 'Other loans', num(l.outstanding))
  for (const c of cards) addL(`${c.bank || ''} ${c.cardName || 'Credit card'}`.trim(), 'Credit card dues', num(c.outstanding))

  const fold = (rows) => {
    if (detailed) return rows
    const m = new Map()
    for (const r of rows) m.set(r.group, (m.get(r.group) || 0) + r.value)
    return [...m].map(([group, value]) => ({ group, label: group, value }))
  }
  const sum = (rows) => rows.reduce((s, r) => s + r.value, 0)
  const A = fold(assetRows), L = fold(liabRows)
  const group = (rows) => { const g = new Map(); for (const r of rows) { if (!g.has(r.group)) g.set(r.group, []); g.get(r.group).push(r) } return [...g].map(([name, items]) => ({ name, items, total: sum(items) })) }
  const totalAssets = sum(assetRows), totalLiabilities = sum(liabRows)
  return { assets: group(A), liabilities: group(L), totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities }
}
