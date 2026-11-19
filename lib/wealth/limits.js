// Yearly contribution limits for tax-saving accounts, counted over the Indian financial year (1 April to 31 March). Pure and tested.
// The limit amounts are set here, in one place. Tax rules change, so the screen tells people to check the current rules.

export const LIMITS = {
  ppf: { label: 'PPF', limit: 150000, note: 'Maximum deposit in a PPF account in a financial year.' },
  nps: { label: 'NPS (extra 50,000 under 80CCD(1B))', limit: 50000, note: 'The additional NPS deduction, over and above the 80C limit.' },
}
export const LIMIT_RULES_FY = '2026-27'

/** The financial year a date falls in, as the year it starts: 2026-11-05 and 2027-02-01 are both FY 2026. */
export function fyStart(dateIso) {
  const [y, m] = String(dateIso).slice(0, 10).split('-').map(Number)
  return m >= 4 ? y : y - 1
}
export const fyLabel = (start) => `${start}-${String((start + 1) % 100).padStart(2, '0')}`

/** Sum of an asset's logged contributions that fall in the financial year of `today`. */
export function contributedThisYear(asset, today = new Date()) {
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const fy = fyStart(iso)
  return (asset?.contributions || []).filter((c) => c && c.date && fyStart(c.date) === fy).reduce((n, c) => n + (Number(c.amount) || 0), 0)
}

/** { used, limit, left, over, pct } for one kind of account across all assets of that category. */
export function limitStatus(assets, category, today = new Date()) {
  const cfg = LIMITS[category]
  const used = (assets || []).filter((a) => a.category === category).reduce((n, a) => n + contributedThisYear(a, today), 0)
  return { used, limit: cfg.limit, left: Math.max(0, cfg.limit - used), over: Math.max(0, used - cfg.limit), pct: Math.min(100, Math.round((used / cfg.limit) * 100)) }
}
