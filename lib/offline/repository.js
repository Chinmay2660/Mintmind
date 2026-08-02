import { db } from './db'
import { createLocalId } from './ids'
import {
  populateBudget,
  populateInvestment,
  populateRecurringExpense,
  populateSalaryRecord,
  populateTransaction,
  toApiPayload,
  toStoreDoc,
} from './normalize'

function getTable(tableName) {
  if (!db) return null
  return db[tableName]
}

function filterBudgetsByPeriod(rows, period) {
  if (!period) return rows
  const now = new Date()
  let startDate

  switch (period) {
    case '1M':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case '3M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      break
    case '6M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      break
    case '1Y':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      return rows
  }

  return rows.filter(
    (budget) => new Date(budget.startDate) <= now && new Date(budget.endDate) >= startDate
  )
}

async function getReferenceData() {
  const [categories, accounts] = await Promise.all([
    listLocal('categories'),
    listLocal('bankAccounts'),
  ])
  return { categories, accounts }
}

async function formatRecord(tableName, row) {
  if (!row) return row

  if (tableName === 'transactions') {
    const { categories, accounts } = await getReferenceData()
    return populateTransaction(row, categories, accounts)
  }

  if (tableName === 'budgets') {
    const { categories } = await getReferenceData()
    return populateBudget(row, categories)
  }

  if (tableName === 'investments') {
    const { accounts } = await getReferenceData()
    return populateInvestment(row, accounts)
  }

  if (tableName === 'salary') {
    const { categories, accounts } = await getReferenceData()
    return populateSalaryRecord(row, categories, accounts)
  }

  if (tableName === 'recurringExpenses') {
    const { categories, accounts } = await getReferenceData()
    return populateRecurringExpense(row, categories, accounts)
  }

  return row
}

function buildTransactionPayload(payload) {
  const base = {
    type: payload.type,
    amount: Number(payload.amount),
    accountId: payload.isCash ? null : payload.accountId,
    isCash: Boolean(payload.isCash),
    description: payload.description || '',
    date: payload.date || new Date().toISOString(),
  }

  if (payload.type === 'transfer') {
    return {
      ...base,
      transferToAccountId: payload.transferToIsCash ? null : payload.transferToAccountId,
      transferToIsCash: Boolean(payload.transferToIsCash),
    }
  }

  return {
    ...base,
    categoryId: payload.categoryId,
  }
}

function applyTransactionFilters(rows, filters = {}) {
  let result = [...rows]

  if (filters.startDate) {
    const start = new Date(filters.startDate)
    result = result.filter((tx) => new Date(tx.date) >= start)
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate)
    result = result.filter((tx) => new Date(tx.date) <= end)
  }

  if (filters.search) {
    const search = String(filters.search).toLowerCase()
    result = result.filter((tx) => (tx.description || '').toLowerCase().includes(search))
  }

  if (filters.types) {
    const types = String(filters.types).split(',').filter(Boolean)
    result = result.filter((tx) => types.includes(tx.type))
  } else if (filters.type) {
    result = result.filter((tx) => tx.type === filters.type)
  }

  if (filters.categoryId) {
    result = result.filter((tx) => {
      const id = tx.categoryId?._id ?? tx.categoryId
      return id === filters.categoryId
    })
  }

  if (filters.accountId) {
    result = result.filter((tx) => {
      const id = tx.accountId?._id ?? tx.accountId
      const toId = tx.transferToAccountId?._id ?? tx.transferToAccountId
      return id === filters.accountId || toId === filters.accountId
    })
  }

  if (filters.isCash === 'true') {
    result = result.filter((tx) => tx.isCash || tx.transferToIsCash)
  }

  return result
}

function applyListFilters(tableName, rows, filters = {}) {
  let result = [...rows]

  if (filters.type) {
    result = result.filter((row) => row.type === filters.type)
  }

  if (filters.isActive !== undefined) {
    const isActive = filters.isActive !== 'false'
    result = result.filter((row) => Boolean(row.isActive) === isActive)
  }

  if (filters.frequency) {
    result = result.filter((row) => row.frequency === filters.frequency)
  }

  if (tableName === 'budgets' && filters.period) {
    result = filterBudgetsByPeriod(result, filters.period)
  }

  if (tableName === 'transactions') {
    result = applyTransactionFilters(result, filters)
    result = result.sort((a, b) => new Date(b.date) - new Date(a.date))
    if (filters.limit) {
      result = result.slice(0, Number(filters.limit))
    }
    return result
  }

  result = result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  return result
}

export async function listLocal(tableName, filters = {}) {
  const table = getTable(tableName)
  if (!table) return []

  let rows = await table.toArray()
  rows = applyListFilters(tableName, rows, filters)

  return Promise.all(rows.map((row) => formatRecord(tableName, row)))
}

export async function getLocal(tableName, id) {
  const table = getTable(tableName)
  if (!table) return null

  const row = await table.get(id)
  if (!row) return null
  return formatRecord(tableName, row)
}

export async function getSingleton(tableName, singletonId) {
  return getLocal(tableName, singletonId)
}

export async function getFamilyDoc() {
  return getSingleton('family', 'family')
}

export async function upsertLocal(tableName, doc) {
  const table = getTable(tableName)
  if (!table) return doc
  const stored = toStoreDoc(doc)
  await table.put(stored)
  return stored
}

export async function upsertSingleton(tableName, singletonId, doc) {
  return upsertLocal(tableName, { ...doc, _id: singletonId })
}

export async function upsertMany(tableName, docs) {
  const table = getTable(tableName)
  if (!table || !docs.length) return
  await table.bulkPut(docs.map(toStoreDoc))
}

export async function clearSingleton(tableName, singletonId) {
  const table = getTable(tableName)
  if (!table) return
  await table.delete(singletonId)
}

export async function createLocal(tableName, data) {
  const table = getTable(tableName)
  if (!table) return data

  const now = new Date().toISOString()
  const record = toStoreDoc({
    ...data,
    _id: createLocalId(),
    _syncStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  })

  await table.put(record)
  return record
}

export async function updateLocal(tableName, id, data) {
  const table = getTable(tableName)
  if (!table) return null

  const existing = await table.get(id)
  if (!existing) return null

  const updated = {
    ...existing,
    ...data,
    _id: id,
    _syncStatus: existing._syncStatus === 'synced' ? 'pending' : existing._syncStatus,
    updatedAt: new Date().toISOString(),
  }

  await table.put(updated)
  return updated
}

export async function deleteLocal(tableName, id) {
  const table = getTable(tableName)
  if (!table) return
  await table.delete(id)
}

export async function enqueueMutation({ entity, operation, entityId, payload }) {
  if (!db) return null

  const item = {
    id: createLocalId(),
    entity,
    operation,
    entityId,
    payload: payload ? toApiPayload(payload) : null,
    createdAt: Date.now(),
    retries: 0,
  }

  await db.outbox.put(item)
  return item
}

export function buildCreatePayload(tableName, data) {
  const payload = toApiPayload(data)

  if (tableName === 'transactions') {
    return buildTransactionPayload(payload)
  }

  if (tableName === 'cash') {
    return { amount: Number(payload.amount ?? 0) }
  }

  if (tableName === 'family') {
    return { name: payload.name }
  }

  return payload
}

export function buildUpdatePayload(tableName, data, existing) {
  const payload = toApiPayload({ ...existing, ...data })

  if (tableName === 'transactions') {
    return buildTransactionPayload(payload)
  }

  if (tableName === 'cash') {
    return { amount: Number(payload.amount ?? existing.amount ?? 0) }
  }

  if (tableName === 'family') {
    const next = {}
    if (payload.name !== undefined) next.name = payload.name
    if (payload.settings !== undefined) next.settings = payload.settings
    return next
  }

  if (tableName === 'userProfile') {
    const next = {}
    if (payload.firstName !== undefined) next.firstName = payload.firstName
    if (payload.lastName !== undefined) next.lastName = payload.lastName
    if (payload.image !== undefined) next.image = payload.image
    return next
  }

  return payload
}

export async function formatEntity(tableName, doc) {
  return formatRecord(tableName, doc)
}
