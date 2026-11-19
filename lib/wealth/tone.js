/**
 * How a gain or loss should read: 'none' (no value), 'flat', 'good' or 'bad', plus the direction and sign.
 * A negative return is 'bad' (or 'good' when invertGood, e.g. spending going down).
 */
export function metricTone({ amount, pct, invertGood = false } = /** @type {{ amount?: number | null, pct?: number | null, invertGood?: boolean }} */ ({})) {
  const v = amount ?? pct
  if (v == null || Number.isNaN(v)) return { state: 'none', dir: 0, sign: '' }
  const flat = Math.abs(v) < (amount != null ? 0.5 : 0.005)
  if (flat) return { state: 'flat', dir: 0, sign: '' }
  const good = invertGood ? v < 0 : v > 0
  return { state: good ? 'good' : 'bad', dir: v > 0 ? 1 : -1, sign: v > 0 ? '+' : '-' }
}
