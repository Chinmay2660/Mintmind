import { db } from './db'
import { createLocalId } from './ids'
import { populateTransaction, toApiPayload, toStoreDoc } from './normalize'

function getTable(tableName) {
  if (!db) return null
  return db[tableName]
}

export async function listLocal(tableName, filters = {}) {
  const table = getTable(tableName)
  if (!table) return []

  let rows = await table.toArray()

  if (filters.type) {
    rows = rows.filter((row) => row.type === filters.type)
  }

  if (tableName === 'transactions') {
    const [categories, accounts] = await Promise.all([
      listLocal('categories'),
      listLocal('bankAccounts'),
    ])
    rows = rows
      .map((row) => populateTransaction(row, categories, accounts))
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    if (filters.limit) {
      rows = rows.slice(0, Number(filters.limit))
    }
  } else {
    rows = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }

  return rows
}

export async function getLocal(tableName, id) {
  const table = getTable(tableName)
  if (!table) return null

  const row = await table.get(id)
  if (!row) return null

  if (tableName === 'transactions') {
    const [categories, accounts] = await Promise.all([
      listLocal('categories'),
      listLocal('bankAccounts'),
    ])
    return populateTransaction(row, categories, accounts)
  }

  return row
}

export async function upsertLocal(tableName, doc) {
  const table = getTable(tableName)
  if (!table) return doc
  const stored = toStoreDoc(doc)
  await table.put(stored)
  return stored
}

export async function upsertMany(tableName, docs) {
  const table = getTable(tableName)
  if (!table || !docs.length) return
  await table.bulkPut(docs.map(toStoreDoc))
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
    return {
      type: payload.type,
      amount: Number(payload.amount),
      categoryId: payload.categoryId,
      accountId: payload.isCash ? null : payload.accountId,
      isCash: Boolean(payload.isCash),
      description: payload.description || '',
      date: payload.date || new Date().toISOString(),
    }
  }
  return payload
}

export function buildUpdatePayload(tableName, data, existing) {
  const payload = toApiPayload({ ...existing, ...data })
  if (tableName === 'transactions') {
    return {
      type: payload.type,
      amount: Number(payload.amount),
      categoryId: payload.categoryId,
      accountId: payload.isCash ? null : payload.accountId,
      isCash: Boolean(payload.isCash),
      description: payload.description || '',
      date: payload.date,
    }
  }
  return payload
}
