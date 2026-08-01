import { parseOfflineRoute } from './entities'
import { isOnline } from './network'
import {
  buildCreatePayload,
  buildUpdatePayload,
  createLocal,
  deleteLocal,
  enqueueMutation,
  getLocal,
  listLocal,
  updateLocal,
  upsertMany,
} from './repository'
import { syncOfflineData, pushOutboxOnly } from './sync'
import { populateTransaction, toStoreDoc } from './normalize'
import networkClient from '@/lib/api/networkClient'

function queryToObject(query) {
  return Object.fromEntries(query.entries())
}

async function readFromNetwork(route) {
  const { config, query } = route
  const params = queryToObject(query)
  const data = await networkClient.get(config.path, { params })
  await upsertMany(
    config.table,
    data.map((doc) => ({ ...toStoreDoc(doc), _syncStatus: 'synced' }))
  )
  return data
}

async function handleGet(route) {
  const { config, query, id } = route
  const filters = queryToObject(query)

  if (isOnline()) {
    try {
      if (id) {
        const doc = await networkClient.get(`${config.path}/${id}`)
        await upsertMany(config.table, [{ ...toStoreDoc(doc), _syncStatus: 'synced' }])
        return doc
      }
      return await readFromNetwork(route)
    } catch {
      // fall through to local cache
    }
  }

  if (id) {
    const doc = await getLocal(config.table, id)
    if (!doc) throw new Error('Not found')
    return doc
  }

  return listLocal(config.table, filters)
}

async function handlePost(route, body) {
  const { config } = route
  const payload = buildCreatePayload(config.table, body)
  const localRecord = await createLocal(config.table, { ...body, ...payload })

  await enqueueMutation({
    entity: route.entity,
    operation: 'create',
    entityId: localRecord._id,
    payload,
  })

  if (isOnline()) {
    try {
      const { idMap } = await pushOutboxOnly()
      const synced = idMap[localRecord._id] ?? (await getLocal(config.table, localRecord._id))
      if (synced) {
        if (config.table === 'transactions') {
          const [categories, accounts] = await Promise.all([
            listLocal('categories'),
            listLocal('bankAccounts'),
          ])
          return populateTransaction(synced, categories, accounts)
        }
        return synced
      }
    } catch {
      // return optimistic local record
    }
  }

  if (config.table === 'transactions') {
    const [categories, accounts] = await Promise.all([
      listLocal('categories'),
      listLocal('bankAccounts'),
    ])
    return populateTransaction(localRecord, categories, accounts)
  }

  return localRecord
}

async function handlePut(route, body) {
  const { config, id } = route
  const existing = await getLocal(config.table, id)
  if (!existing) throw new Error('Not found')

  const payload = buildUpdatePayload(config.table, body, existing)
  const updated = await updateLocal(config.table, id, { ...body, ...payload })

  await enqueueMutation({
    entity: route.entity,
    operation: 'update',
    entityId: id,
    payload,
  })

  if (isOnline()) {
    try {
      await pushOutboxOnly()
      const synced = await getLocal(config.table, id)
      if (synced) {
        if (config.table === 'transactions') {
          const [categories, accounts] = await Promise.all([
            listLocal('categories'),
            listLocal('bankAccounts'),
          ])
          return populateTransaction(synced, categories, accounts)
        }
        return synced
      }
    } catch {
      // return optimistic local record
    }
  }

  if (config.table === 'transactions') {
    const [categories, accounts] = await Promise.all([
      listLocal('categories'),
      listLocal('bankAccounts'),
    ])
    return populateTransaction(updated, categories, accounts)
  }

  return updated
}

async function handleDelete(route) {
  const { config, id } = route
  const existing = await getLocal(config.table, id)
  if (!existing) throw new Error('Not found')

  await enqueueMutation({
    entity: route.entity,
    operation: 'delete',
    entityId: id,
    payload: null,
  })

  await deleteLocal(config.table, id)

  if (isOnline()) {
    try {
      await pushOutboxOnly()
    } catch {
      // deletion is already reflected locally
    }
  }

  return { message: 'Deleted' }
}

export async function offlineRequest(method, url, data) {
  const route = parseOfflineRoute(url, method)
  if (!route) return null

  switch (method.toUpperCase()) {
    case 'GET':
      return handleGet(route)
    case 'POST':
      return handlePost(route, data)
    case 'PUT':
      return handlePut(route, data)
    case 'DELETE':
      return handleDelete(route)
    default:
      return null
  }
}

export function stripApiPrefix(url) {
  return url.replace(/^\/api/, '') || '/'
}
