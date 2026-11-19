/** Subscriptions and other fixed payments the person sets up by hand. Stored as a list in the meta table under "subscriptions". */
export const SUB_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', months: 1 },
  { value: 'quarterly', label: 'Every 3 months', months: 3 },
  { value: 'yearly', label: 'Yearly', months: 12 },
]
const monthsOf = (f) => SUB_FREQUENCIES.find((x) => x.value === f)?.months ?? 1

/** Cost per month, whatever the billing period. */
export const monthlyCost = (s) => (Number(s.amount) || 0) / monthsOf(s.frequency)

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The next billing date on or after today, counted from the first payment date. Short months use their last day. */
export function nextSubscriptionDate(s, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.startDate || '')
  if (!m) return null
  const [y, mo, day] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])]
  const step = monthsOf(s.frequency)
  const t = iso(today)
  for (let k = 0; k < 2400; k++) {
    const total = mo + k * step
    const yy = y + Math.floor(total / 12), mm = total % 12
    const d = new Date(yy, mm, Math.min(day, new Date(yy, mm + 1, 0).getDate()))
    if (iso(d) >= t) return iso(d)
  }
  return null
}
