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

const V4_STORES = {
  ...V3_STORES,
  tags: '_id, _syncStatus',
  rules: '_id, _syncStatus',
  loans: '_id, _syncStatus',
  subscriptions: '_id, _syncStatus',
  reminders: '_id, dueDate, _syncStatus',
  goals: '_id, status, _syncStatus',
  sipPlans: '_id, _syncStatus',
}

const V5_STORES = {
  ...V4_STORES,
  loanPayments: '_id, loanId, _syncStatus',
}

const V6_STORES = {
  ...V5_STORES,
  debitCards: '_id, accountId, _syncStatus',
}

class MintmindDB extends Dexie {
  constructor() {
    super('mintmind')
    this.version(1).stores(V1_STORES)
    this.version(2).stores(V2_STORES)
    this.version(3).stores(V3_STORES)
    this.version(4).stores(V4_STORES)
    this.version(5).stores(V5_STORES)
    this.version(6).stores(V6_STORES)
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
  'debitCards',
  'insurance',
  'tags',
  'rules',
  'loans',
  'loanPayments',
  'subscriptions',
  'reminders',
  'goals',
  'sipPlans',
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
