// Search that behaves the way people expect. Pure and tested.
// "hdfc savings", "savings hdfc" and "HDFC  Savings" all find the same account; amounts match with or without commas or the rupee sign.

export const normalize = (s) => String(s ?? '').toLowerCase().replace(/[₹,]/g, '').replace(/\s+/g, ' ').trim()
export const tokens = (q) => normalize(q).split(' ').filter(Boolean)

/** True when every word of the query appears somewhere in the given fields. An empty query matches everything. */
export function matchesAll(query, ...fields) {
  const t = tokens(query)
  if (!t.length) return true
  const hay = normalize(fields.join(' '))
  return t.every((w) => hay.includes(w))
}
