// When can a premium be marked as paid? Pure and tested.
// Marking a premium paid moves the next due date forward by one period. If that could be done any number of times,
// a yearly premium could be "paid" twelve times in a row. So a payment is accepted only when it is overdue or close to due.

const DAY = 86400000
const parse = (s) => new Date(`${String(s).slice(0, 10)}T00:00:00`).getTime()
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const iso = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** How many days before the due date a payment may be recorded, by how often the premium is paid. */
export const PAY_WINDOW_DAYS = { monthly: 10, quarterly: 21, half_yearly: 30, yearly: 45 }

/**
 * { ok, reason, opensOn } for a policy. `ok` is false when the premium is single, the policy has ended,
 * or the next due date is still further away than the window (so it is already paid for this period).
 */
export function premiumPayable(policy, today = new Date()) {
  if (!policy) return { ok: false, reason: 'Policy not found.' }
  if (policy.frequency === 'single') return { ok: false, reason: 'This is a single-premium policy: nothing more to pay.' }
  if (!policy.nextPremium) return { ok: false, reason: 'No due date is set for this policy.' }
  const t = midnight(today)
  if (policy.endDate && parse(policy.endDate) < t) return { ok: false, reason: 'This policy has ended.' }
  const due = parse(policy.nextPremium)
  const window = PAY_WINDOW_DAYS[policy.frequency] ?? 45
  const opens = due - window * DAY
  if (t >= opens) return { ok: true, reason: '' }
  return { ok: false, opensOn: iso(opens), reason: `Already paid for this period. The next premium is due on ${iso(due)}; you can mark it paid from ${iso(opens)}.` }
}
