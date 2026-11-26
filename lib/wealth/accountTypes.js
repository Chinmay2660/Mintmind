/** Groups the asset categories into the account types people think in. Pure, so it can be tested. */
export const TYPE_GROUPS = [
  { key: 'cash', label: 'Cash and bank', cats: ['bank'] },
  { key: 'invest', label: 'Investments', cats: ['mutualFunds', 'stocks', 'etf', 'fd', 'rd', 'gold', 'commodity'] },
  { key: 'retire', label: 'Retirement', cats: ['epf', 'ppf', 'nps'] },
  { key: 'property', label: 'Property and vehicles', cats: ['realEstate', 'vehicle'] },
]

/** assetBreakdown is { category: value }. Anything not listed above lands in "Other". Zero groups are dropped. */
export function byAccountType(assetBreakdown = {}) {
  const known = new Set(TYPE_GROUPS.flatMap((g) => g.cats))
  const rows = TYPE_GROUPS.map((g) => ({ key: g.key, label: g.label, value: g.cats.reduce((s, c) => s + (Number(assetBreakdown[c]) || 0), 0) }))
  const other = Object.entries(assetBreakdown).filter(([c]) => !known.has(c)).reduce((s, [, v]) => s + (Number(v) || 0), 0)
  rows.push({ key: 'other', label: 'Other', value: other })
  const total = rows.reduce((s, r) => s + r.value, 0)
  return rows.filter((r) => r.value > 0).map((r) => ({ ...r, pct: total ? Math.round((r.value / total) * 1000) / 10 : 0 }))
}
