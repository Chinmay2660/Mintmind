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

const PREVIEW_ROWS = [
  { key: 'netWorth', label: 'Net worth', perm: 'netWorth', kind: 'money' },
  { key: 'assets', label: 'Total assets', perm: 'netWorth', kind: 'money' },
  { key: 'liabilities', label: 'Total liabilities', perm: 'netWorth', kind: 'money' },
  { key: 'growthPct', label: 'Net worth growth', perm: 'netWorth', kind: 'pct' },
  { key: 'bank', label: 'Bank balances (total)', perm: 'bank', kind: 'money' },
  { key: 'mutualFunds', label: 'Mutual funds (current value)', perm: 'mutualFunds', kind: 'money' },
  { key: 'insuranceCover', label: 'Insurance cover (total)', perm: 'insurance', kind: 'money' },
  { key: 'overview', label: 'That you are in the circle', perm: 'overview', kind: 'flag' },
  { key: 'documents', label: 'Names of your documents (never the files)', perm: 'documents', kind: 'flag' },
]

/**
 * What another member of the circle can see of you, row by row. Money rows come from visibleSummary itself, the same
 * function the server uses, so this preview cannot drift from what is really shared. Everything else stays hidden.
 * Returns [{ key, label, kind, visible, value }]. Personal budgets and spending are never part of the summary.
 */
export function sharingPreview(summary, permissions) {
  const shown = visibleSummary(summary, permissions) || {}
  const off = !permissions || permissions.emergencyOnly
  return PREVIEW_ROWS.map((r) => {
    if (r.kind === 'flag') return { key: r.key, label: r.label, kind: r.kind, visible: !off && !!permissions[r.perm], value: null }
    const has = shown[r.key] !== undefined && shown[r.key] !== null
    return { key: r.key, label: r.label, kind: r.kind, visible: has, value: has ? shown[r.key] : null }
  })
}

/**
 * What `member` lets one particular person (`viewerId`) see: the personal setting made for that person if there is one,
 * otherwise the setting that applies to the whole circle. `overrides` is either a map { viewerId: permissions } or a list of
 * { viewerId, permissions }, so it works for the demo and for stored records.
 */
export function permissionsFor(member, viewerId) {
  const o = member?.overrides
  const hit = Array.isArray(o) ? o.find((x) => String(x.viewerId) === String(viewerId))?.permissions : o?.[String(viewerId)]
  return hit || member?.permissions
}
