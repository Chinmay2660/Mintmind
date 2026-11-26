// Totals shown in the headers of the holdings and loans pages. Pure, so the edge cases can be tested.

/** Returns over a list of holdings. `rows` are { value, gain } where gain is null when no cost was recorded (then it is left out). */
export function returnTotals(rows) {
  const costed = rows.filter((r) => r.gain != null)
  const gain = costed.reduce((n, r) => n + r.gain, 0)
  const base = costed.reduce((n, r) => n + (r.value - r.gain), 0)
  return { value: rows.reduce((n, r) => n + r.value, 0), gain: costed.length ? gain : null, pct: costed.length && base > 0 ? (gain / base) * 100 : null }
}

/** Interest rate across loans, weighted by what is still owed. Null when no loan has both a rate and a balance. Values may be text from an import. */
export function weightedRate(loans) {
  const rated = loans.map((l) => ({ rate: Number(l.rate) || 0, owed: Number(l.outstanding) || 0 })).filter((l) => l.rate > 0 && l.owed > 0)
  const owed = rated.reduce((n, l) => n + l.owed, 0)
  return owed > 0 ? rated.reduce((n, l) => n + l.rate * l.owed, 0) / owed : null
}
