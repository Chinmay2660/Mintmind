const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

/**
 * The category parts of an expense. A plain expense is one part. A split expense is the parts the person chose, as long as they
 * add up to the amount: if they do not (an old edit, a broken record), the whole amount stays on its main category, so totals
 * can never be more or less than what was actually spent.
 */
export function expenseParts(e) {
  const amount = Number(e?.amount) || 0
  const sp = Array.isArray(e?.splits) ? e.splits.filter((s) => s && s.category && Number(s.amount) > 0) : []
  if (sp.length >= 2 && Math.abs(sp.reduce((s, x) => s + Number(x.amount), 0) - amount) < 0.01) return sp.map((s) => ({ category: s.category, amount: round2(s.amount) }))
  return [{ category: e?.category, amount }]
}

/** Checks a proposed split. Returns { ok, error, left, splits } where splits are cleaned and merged by category. */
export function checkSplits(amount, rows) {
  const total = round2(amount)
  const merged = new Map()
  for (const r of rows || []) {
    const a = round2(r.amount)
    if (!r.category || !(a > 0)) continue
    merged.set(r.category, round2((merged.get(r.category) || 0) + a))
  }
  const splits = [...merged].map(([category, amount]) => ({ category, amount }))
  const sum = round2(splits.reduce((s, x) => s + x.amount, 0))
  const left = round2(total - sum)
  if (splits.length < 2) return { ok: false, error: 'Use at least two categories', left, splits }
  if (left !== 0) return { ok: false, error: left > 0 ? `${left} is still unassigned` : `The parts are ${-left} more than the amount`, left, splits }
  return { ok: true, error: '', left: 0, splits }
}

/** The main category of a split: the one with the most money (the first on a tie). */
export const mainCategory = (splits) => [...splits].sort((a, b) => b.amount - a.amount)[0].category
