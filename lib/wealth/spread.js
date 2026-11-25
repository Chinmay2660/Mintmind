// Budget spreading: a payment made on one day can count towards the budget of several months (a 6,000 bill paid today that
// covers last month and this month is 3,000 against each). The money still leaves the account on the day it was paid; only
// the budget totals use the spread. Stored on the expense as budgetMonths: [{ ym: '2026-10', amount: 3000 }, ...].
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const monthOf = (iso) => String(iso).slice(0, 7)

export function addMonths(ym, k) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + k, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Equal parts over n months starting at startYm; any odd paisa goes to the last month so the parts add up exactly. */
export function spreadMonths(amount, startYm, n) {
  const count = Math.max(1, Math.min(24, Math.floor(Number(n)) || 1))
  const total = round2(amount)
  const each = Math.floor((total / count) * 100) / 100
  const out = []
  let used = 0
  for (let i = 0; i < count; i++) {
    const a = i === count - 1 ? round2(total - used) : each
    used = round2(used + a)
    out.push({ ym: addMonths(startYm, i), amount: a })
  }
  return out
}

/**
 * The months an expense counts towards, as [{ ym, share }] where the shares add up to 1. A plain expense is the month of its
 * date. A spread that no longer adds up to the amount (the amount was edited) is ignored, so totals are never wrong.
 */
export function monthShares(e) {
  const amount = Number(e?.amount) || 0
  const b = Array.isArray(e?.budgetMonths) ? e.budgetMonths.filter((x) => x && /^\d{4}-\d{2}$/.test(x.ym) && Number(x.amount) > 0) : []
  if (b.length >= 1 && amount > 0 && Math.abs(b.reduce((s, x) => s + Number(x.amount), 0) - amount) < 0.01) {
    const merged = new Map()
    for (const x of b) merged.set(x.ym, (merged.get(x.ym) || 0) + Number(x.amount) / amount)
    return [...merged].map(([ym, share]) => ({ ym, share }))
  }
  return [{ ym: monthOf(e?.date), share: 1 }]
}
