// How old is a NAV? Pure helpers (tested). Mutual fund NAVs are published each business day, so "old" is counted in
// business days: a Friday NAV is still current on Monday morning.

const toDay = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null }

/** Weekdays (Mon-Fri) from `fromISO` up to `toISO`; holidays are not known, so this errs on the side of calling a NAV old. */
export function businessDaysBetween(fromISO, toISO) {
  const a = toDay(fromISO), b = toDay(toISO)
  if (a == null || b == null || b <= a) return 0
  let n = 0
  for (let t = a + 86400000; t <= b; t += 86400000) { const d = new Date(t).getUTCDay(); if (d !== 0 && d !== 6) n++ }
  return n
}

export const STALE_AFTER_BUSINESS_DAYS = 4

/** { days, stale, unknown }. A missing date is "unknown", not "stale". */
export function navFreshness(navDate, todayISO) {
  if (!toDay(navDate)) return { days: null, stale: false, unknown: true }
  const days = businessDaysBetween(navDate, todayISO)
  return { days, stale: days > STALE_AFTER_BUSINESS_DAYS, unknown: false }
}

/** "just now", "5 min ago", "3 h ago", "2 days ago" for a refresh time. */
export function agoLabel(iso, now = Date.now()) {
  const t = Date.parse(iso || '')
  if (!Number.isFinite(t)) return ''
  const m = Math.max(0, Math.round((now - t) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

/** Funds worth looking up: linked to a scheme, and not looked up yet today (mfapi.in publishes one NAV a day and asks for few calls). */
export const fundsToRefresh = (funds, todayISO) => funds.filter((f) => f.schemeCode && String(f.navFetchedAt || '').slice(0, 10) !== todayISO)
