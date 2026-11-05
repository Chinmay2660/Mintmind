// Single place that decides what of a member's shared summary other members may see.
// Used by the API (server-side enforcement) and by the demo adapter.

const FIELD_PERMISSION = {
  netWorth: 'netWorth',
  assets: 'netWorth',
  liabilities: 'netWorth',
  growthPct: 'netWorth',
  bank: 'bank',
  mutualFunds: 'mutualFunds',
  insuranceCover: 'insurance',
  joint: 'netWorth',
  overview: 'overview',
}

/** Returns only the summary fields the owner has permitted. Emergency-only members expose nothing here. */
export function visibleSummary(summary, permissions) {
  if (!summary || !permissions || permissions.emergencyOnly) return null
  const out = {}
  for (const [field, perm] of Object.entries(FIELD_PERMISSION)) {
    if (permissions[perm] && summary[field] !== undefined) out[field] = summary[field]
  }
  return Object.keys(out).length ? out : null
}

/**
 * Family totals without double counting jointly owned assets.
 * Each member's net worth is added once; a joint asset reported by k members (same key) is
 * counted once, i.e. (k-1) duplicates are subtracted from assets and net worth.
 */
export function familyTotals(rows) {
  let assets = 0
  let liabilities = 0
  const jointSeen = new Map()
  for (const r of rows) {
    if (!r) continue
    assets += Number(r.assets) || 0
    liabilities += Number(r.liabilities) || 0
    for (const j of r.joint || []) {
      const cur = jointSeen.get(j.key) || { value: Number(j.value) || 0, n: 0 }
      cur.n += 1
      jointSeen.set(j.key, cur)
    }
  }
  let duplicates = 0
  for (const { value, n } of jointSeen.values()) if (n > 1) duplicates += value * (n - 1)
  assets -= duplicates
  return { assets, liabilities, netWorth: assets - liabilities, jointDeduplicated: duplicates }
}
