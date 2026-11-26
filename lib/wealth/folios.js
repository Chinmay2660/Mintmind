import { fundMetrics } from './calc.js'

/** True when two fund records are the same fund (a fund can be held in several folios, each its own record). */
export const sameFund = (a, b) => (a.schemeCode ? String(b.schemeCode) === String(a.schemeCode) : !b.schemeCode && String(a.name).trim().toLowerCase() === String(b.name).trim().toLowerCase())

/**
 * One fund held in one or more folios, added together: units, invested amount and value are summed, and the figures
 * are worked out again from the folios' transactions. The result takes the id of the first folio. Folios are never changed.
 */
export function mergeFolios(list, txns, today) {
  if (list.length === 1) return { f: list[0], m: fundMetrics(list[0], txns, today) }
  const ids = new Set(list.map((x) => x.id)), sum = (k) => list.reduce((n, x) => n + (Number(x[k]) || 0), 0)
  const f = { ...list[0], units: sum('units'), invested: sum('invested'), currentValue: sum('currentValue') }
  return { f, m: fundMetrics(f, txns.filter((t) => ids.has(t.fundId)).map((t) => ({ ...t, fundId: f.id })), today) }
}
