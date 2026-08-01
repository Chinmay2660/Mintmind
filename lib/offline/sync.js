import networkClient from '@/lib/api/networkClient'
import { ENTITIES } from './entities'
import { db, setMeta } from './db'
import { isLocalId } from './ids'
import { isOnline } from './network'
import {
  deleteLocal,
  enqueueMutation,
  listLocal,
  upsertLocal,
  upsertMany,
} from './repository'
import { toStoreDoc } from './normalize'

let isSyncing = false

async function pullEntity(entityKey) {
  const config = ENTITIES[entityKey]
  const data = await networkClient.get(config.path)
  await upsertMany(
    config.table,
    data.map((doc) => ({ ...toStoreDoc(doc), _syncStatus: 'synced' }))
  )
}

async function processOutboxItem(item) {
  const config = ENTITIES[item.entity]
  if (!config) return null

  if (item.operation === 'create') {
    const created = await networkClient.post(config.path, item.payload)
    const stored = { ...toStoreDoc(created), _syncStatus: 'synced' }
    if (isLocalId(item.entityId)) {
      await deleteLocal(config.table, item.entityId)
    }
    await upsertLocal(config.table, stored)
    return { localId: item.entityId, doc: stored }
  }

  if (item.operation === 'update') {
    if (isLocalId(item.entityId)) {
      const created = await networkClient.post(config.path, item.payload)
      const stored = { ...toStoreDoc(created), _syncStatus: 'synced' }
      await deleteLocal(config.table, item.entityId)
      await upsertLocal(config.table, stored)
      return { localId: item.entityId, doc: stored }
    }
    const updated = await networkClient.put(`${config.path}/${item.entityId}`, item.payload)
    const stored = { ...toStoreDoc(updated), _syncStatus: 'synced' }
    await upsertLocal(config.table, stored)
    return { doc: stored }
  }

  if (item.operation === 'delete') {
    if (!isLocalId(item.entityId)) {
      await networkClient.delete(`${config.path}/${item.entityId}`)
    }
    await deleteLocal(config.table, item.entityId)
    return { deletedId: item.entityId }
  }

  return null
}

export async function pushOutboxOnly() {
  if (!db || typeof window === 'undefined') return { pushed: 0, idMap: {} }
  if (!isOnline()) return { pushed: 0, idMap: {} }
  if (isSyncing) return { pushed: 0, idMap: {} }

  isSyncing = true
  let pushed = 0
  const idMap = {}

  try {
    const outboxItems = await db.outbox.orderBy('createdAt').toArray()
    for (const item of outboxItems) {
      if (!isOnline()) break
      try {
        const result = await processOutboxItem(item)
        if (result?.localId && result?.doc) {
          idMap[result.localId] = result.doc
        }
        await db.outbox.delete(item.id)
        pushed += 1
      } catch {
        await db.outbox.update(item.id, { retries: (item.retries || 0) + 1 })
        break
      }
    }

    if (pushed > 0) {
      await setMeta('lastSyncedAt', new Date().toISOString())
    }
    return { pushed, idMap }
  } finally {
    isSyncing = false
  }
}

export async function syncOfflineData({ force = false } = {}) {
  if (!db || typeof window === 'undefined') return { pulled: false, pushed: 0, idMap: {} }
  if (!isOnline() && !force) return { pulled: false, pushed: 0, idMap: {} }
  if (isSyncing) return { pulled: false, pushed: 0, idMap: {} }

  isSyncing = true
  let pushed = 0
  const idMap = {}

  try {
    const orderedEntities = Object.entries(ENTITIES)
      .sort(([, a], [, b]) => a.syncOrder - b.syncOrder)
      .map(([key]) => key)

    for (const entityKey of orderedEntities) {
      try {
        await pullEntity(entityKey)
      } catch {
        // ponytail: keep going with cached data if pull fails mid-sync
      }
    }

    const outboxItems = await db.outbox.orderBy('createdAt').toArray()
    for (const item of outboxItems) {
      if (!isOnline()) break
      try {
        const result = await processOutboxItem(item)
        if (result?.localId && result?.doc) {
          idMap[result.localId] = result.doc
        }
        await db.outbox.delete(item.id)
        pushed += 1
      } catch {
        await db.outbox.update(item.id, { retries: (item.retries || 0) + 1 })
        break
      }
    }

    await setMeta('lastSyncedAt', new Date().toISOString())
    return { pulled: true, pushed, idMap }
  } finally {
    isSyncing = false
  }
}
