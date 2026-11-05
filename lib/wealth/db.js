import Dexie from 'dexie'

/**
 * Wealth data lives in a per-profile IndexedDB database:
 *   mm-wealth-<userId>  for real users
 *   mm-wealth-demo      for Demo Mode (fully isolated from real accounts, never synced)
 */
const SCHEMA_V1 = {
  bankAccounts: 'id, bankName',
  balanceHistory: 'id, accountId, date',
  bankTxns: 'id, accountId, date',
  funds: 'id, fundHouse',
  fundTxns: 'id, fundId, date',
  sips: 'id, fundId, status',
  assets: 'id, category',
  liabilities: 'id, category',
  cards: 'id',
  cardStatements: 'id, cardId',
  cardPayments: 'id, cardId, date',
  policies: 'id, type',
  premiums: 'id, policyId, date',
  expenses: 'id, date, category',
  budgets: 'id', // id = 'YYYY-MM' -> { total, categories: {Food: n}, rollover }
  members: 'id',
  vaultItems: 'id, category',
  documents: 'id, category',
  legacy: 'id',
  snapshots: 'id, date',
  meta: 'key',
}

// v2 adds debit cards (linked to a bank account)
const SCHEMA_V2 = { ...SCHEMA_V1, debitCards: 'id, accountId' }
// v3 adds transfers between cash / bank accounts and cards
const SCHEMA_V3 = { ...SCHEMA_V2, transfers: 'id, date' }
// v4 adds user automations and their run history
const SCHEMA_V4 = { ...SCHEMA_V3, automations: 'id', automationRuns: 'id, ruleId, at' }
// v5 adds goals (emergency fund, marriage fund, ...) linked to accounts, funds and assets
const SCHEMA = { ...SCHEMA_V4, goals: 'id' }

export const TABLES = Object.keys(SCHEMA)

const cache = new Map()

export function openWealthDB(profileId) {
  const name = `mm-wealth-${profileId}`
  if (!cache.has(name)) {
    const db = new Dexie(name)
    db.version(1).stores(SCHEMA_V1)
    db.version(2).stores(SCHEMA_V2)
    db.version(3).stores(SCHEMA_V3)
    db.version(4).stores(SCHEMA_V4)
    db.version(5).stores(SCHEMA)
    cache.set(name, db)
  }
  return cache.get(name)
}

export function uid(prefix = 'id') {
  const r =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return `${prefix}_${r}`
}

export async function clearAll(db) {
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    for (const t of TABLES) await db[t].clear()
  })
}
