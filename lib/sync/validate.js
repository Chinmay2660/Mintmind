// Shared checks for the sync API. Kept free of database code so they can be unit tested.

export const SYNC_TABLES = [
  'bankAccounts', 'balanceHistory', 'bankTxns', 'funds', 'fundTxns', 'sips', 'assets', 'liabilities', 'cards',
  'cardStatements', 'cardPayments', 'policies', 'premiums', 'expenses', 'budgets', 'members', 'vaultItems',
  'documents', 'legacy', 'snapshots', 'meta', 'debitCards', 'transfers', 'automations', 'automationRuns', 'goals',
]

/** Device-only bookkeeping that must never leave the device. */
export const LOCAL_ONLY_META = new Set(['seeded', 'seedVersion'])

export const MAX_OPS = 200
export const MAX_DOC_BYTES = 1_000_000
export const MAX_KEY_LENGTH = 200

/** Returns { ok: true, ops } with clean ops, or { ok: false, error }. Each op is { table, key, data } or { table, key, deleted: true }. */
export function parseOps(body) {
  const raw = body && body.ops
  if (!Array.isArray(raw)) return { ok: false, error: 'ops must be a list' }
  if (raw.length > MAX_OPS) return { ok: false, error: `At most ${MAX_OPS} changes at a time` }
  const ops = []
  for (const o of raw) {
    if (!o || typeof o !== 'object') return { ok: false, error: 'Bad change' }
    if (!SYNC_TABLES.includes(o.table)) return { ok: false, error: `Unknown table: ${String(o.table).slice(0, 40)}` }
    if (typeof o.key !== 'string' || !o.key || o.key.length > MAX_KEY_LENGTH) return { ok: false, error: 'Bad key' }
    if (o.table === 'meta' && LOCAL_ONLY_META.has(o.key)) continue
    if (o.deleted) { ops.push({ table: o.table, key: o.key, deleted: true }); continue }
    if (!o.data || typeof o.data !== 'object' || Array.isArray(o.data)) return { ok: false, error: 'Bad data' }
    if (JSON.stringify(o.data).length > MAX_DOC_BYTES) return { ok: false, error: 'A record is too large' }
    ops.push({ table: o.table, key: o.key, data: o.data })
  }
  return { ok: true, ops }
}
