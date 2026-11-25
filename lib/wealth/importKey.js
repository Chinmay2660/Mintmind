// Exact fingerprints for imported statement rows. The same row in the same account always gets the same key, so importing a
// file a second time is recognised for certain. Two identical rows inside one file (two Rs 50 teas on one day) get
// different keys (#1, #2), so both are kept the first time and both are recognised the second time.

const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function baseKey(item, accountId) {
  return [accountId || '', item.kind, item.date, Number(item.amount).toFixed(2), squash(item.note)].join('|')
}

/** Adds `importKey` to every item. Items must be in file order. */
export function withImportKeys(items, accountId) {
  const seen = new Map()
  return items.map((it) => {
    const b = baseKey(it, accountId)
    const n = (seen.get(b) || 0) + 1
    seen.set(b, n)
    return { ...it, importKey: `${b}#${n}` }
  })
}

/** Set of keys already stored on expenses or bank entries. */
export function existingImportKeys(...tables) {
  const out = new Set()
  for (const t of tables) for (const r of t || []) if (r.importKey) out.add(r.importKey)
  return out
}

/** Income that looks like a bank entry already recorded: same account, amount, and date within a day. */
export function looksLikeExistingIncome(item, accountId, bankTxns) {
  const day = (d) => Date.parse(`${d}T00:00:00Z`)
  return (bankTxns || []).some((t) => t.type === 'income' && t.accountId === accountId && Math.abs(Number(t.amount) - Number(item.amount)) < 0.005 && Math.abs(day(t.date) - day(item.date)) <= 86400000)
}
