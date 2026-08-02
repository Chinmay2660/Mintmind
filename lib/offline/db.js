import Dexie from 'dexie'

const V1_STORES = {
  transactions: '_id, type, date, _syncStatus',
  categories: '_id, type, _syncStatus',
  bankAccounts: '_id, _syncStatus',
  meta: 'key',
  outbox: 'id, entity, createdAt',
}

const V2_STORES = {
  ...V1_STORES,
  investments: '_id, type, _syncStatus',
  budgets: '_id, _syncStatus',
  salary: '_id, _syncStatus',
  recurringExpenses: '_id, frequency, _syncStatus',
  cash: '_id, _syncStatus',
  family: '_id, _syncStatus',
  familyGoals: '_id, _syncStatus',
  familyBudgets: '_id, _syncStatus',
  familyExpenses: '_id, _syncStatus',
}

const V3_STORES = {
  ...V2_STORES,
  creditCards: '_id, _syncStatus',
  insurance: '_id, type, _syncStatus',
}

class MintmindDB extends Dexie {
  constructor() {
    super('mintmind')
    this.version(1).stores(V1_STORES)
    this.version(2).stores(V2_STORES)
    this.version(3).stores(V3_STORES)
  }
}

export const db = typeof window !== 'undefined' ? new MintmindDB() : null

const DATA_TABLES = [
  'transactions',
  'categories',
  'bankAccounts',
  'investments',
  'budgets',
  'salary',
  'recurringExpenses',
  'cash',
  'family',
  'familyGoals',
  'familyBudgets',
  'familyExpenses',
  'creditCards',
  'insurance',
]

export async function clearOfflineData() {
  if (!db) return
  await Promise.all([
    ...DATA_TABLES.map((table) => db[table].clear()),
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
