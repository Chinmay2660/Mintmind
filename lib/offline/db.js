import Dexie from 'dexie'

class MintmindDB extends Dexie {
  constructor() {
    super('mintmind')
    this.version(1).stores({
      transactions: '_id, type, date, _syncStatus',
      categories: '_id, type, _syncStatus',
      bankAccounts: '_id, _syncStatus',
      meta: 'key',
      outbox: 'id, entity, createdAt',
    })
  }
}

export const db = typeof window !== 'undefined' ? new MintmindDB() : null

export async function clearOfflineData() {
  if (!db) return
  await Promise.all([
    db.transactions.clear(),
    db.categories.clear(),
    db.bankAccounts.clear(),
    db.meta.clear(),
    db.outbox.clear(),
  ])
}

export async function getMeta(key) {
  if (!db) return null
  const row = await db.meta.get(key)
  return row?.value ?? null
}

export async function setMeta(key, value) {
  if (!db) return
  await db.meta.put({ key, value })
}

export async function getPendingCount() {
  if (!db) return 0
  return db.outbox.count()
}
