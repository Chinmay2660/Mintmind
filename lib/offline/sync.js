import networkClient from '@/lib/api/networkClient'
import { ENTITIES } from './entities'
import { db, getMeta, setMeta } from './db'
import { isLocalId } from './ids'
import { isOnline } from './network'
import {
  clearSingleton,
  deleteLocal,
  enqueueMutation,
  upsertLocal,
  upsertMany,
  upsertSingleton,
} from './repository'
import { toStoreDoc, unwrapEntityResponse } from './normalize'

let isSyncing = false

// ponytail: skips full pull when synced recently; upgrade path is force=true (pull-to-refresh)
const MIN_SYNC_INTERVAL_MS = 60_000

async function pullEntity(entityKey) {
  const config = ENTITIES[entityKey]
  if (!config || config.pull === false) return

  const data = await networkClient.get(config.path)

  if (config.singleton) {
    const doc = unwrapEntityResponse(data, config.wrapKey)
    if (doc) {
      await upsertSingleton(config.table, config.singletonId, {
        ...toStoreDoc(doc),
        _syncStatus: 'synced',
      })
    } else {
      await clearSingleton(config.table, config.singletonId)
    }
    return
  }

  const items = Array.isArray(data) ? data : []
  await upsertMany(
    config.table,
    items.map((doc) => ({ ...toStoreDoc(doc), _syncStatus: 'synced' }))
  )
}

async function storeSyncedDoc(config, doc, localId) {
  const stored = {
    ...toStoreDoc(doc),
    _syncStatus: 'synced',
  }

  if (config.singleton) {
    if (localId && isLocalId(localId)) {
      await deleteLocal(config.table, localId)
    }
    await upsertSingleton(config.table, config.singletonId, stored)
    return stored
  }

  if (localId && isLocalId(localId)) {
    await deleteLocal(config.table, localId)
  }
  await upsertLocal(config.table, stored)
  return stored
}

async function processOutboxItem(item) {
  const config = ENTITIES[item.entity]
  if (!config) return null

  if (config.updateOnly) {
    await networkClient.put(config.path, item.payload)
    return { doc: item.payload }
  }

  if (item.operation === 'create') {
    const created = await networkClient.post(config.path, item.payload)
    const raw = unwrapEntityResponse(created, config.wrapKey) ?? created
    const stored = await storeSyncedDoc(config, raw, item.entityId)
    return { localId: item.entityId, doc: stored }
  }

  if (item.operation === 'update') {
    if (config.singleton) {
      const updated = await networkClient.put(config.path, item.payload)
      const raw = unwrapEntityResponse(updated, config.wrapKey) ?? updated
      const stored = await storeSyncedDoc(config, raw, item.entityId)
      return { doc: stored }
    }

    if (isLocalId(item.entityId)) {
      const created = await networkClient.post(config.path, item.payload)
      const stored = await storeSyncedDoc(config, created, item.entityId)
      return { localId: item.entityId, doc: stored }
    }

    const updated = await networkClient.put(`${config.path}/${item.entityId}`, item.payload)
    const stored = await storeSyncedDoc(config, updated, item.entityId)
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

async function pullComputedCaches() {
  const cacheRoutes = [
    { path: '/family/stats', key: 'cache:family:stats' },
  ]

  for (const route of cacheRoutes) {
    try {
      const data = await networkClient.get(route.path)
      await setMeta(route.key, data)
    } catch {
    }
  }
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
    const lastSynced = await getMeta('lastSyncedAt')
    const skipPull =
      !force &&
      lastSynced &&
      Date.now() - new Date(lastSynced).getTime() < MIN_SYNC_INTERVAL_MS

    if (!skipPull) {
      const orderedEntities = Object.entries(ENTITIES)
        .sort(([, a], [, b]) => a.syncOrder - b.syncOrder)
        .map(([key]) => key)

      for (const entityKey of orderedEntities) {
        try {
          await pullEntity(entityKey)
        } catch {
        }
      }

      await pullComputedCaches()
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

    if (!skipPull) {
      await setMeta('lastSyncedAt', new Date().toISOString())
    }
    return { pulled: !skipPull, pushed, idMap }
  } finally {
    isSyncing = false
  }
}
