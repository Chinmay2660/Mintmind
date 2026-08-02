import { OfflineUnavailableError, parseOfflineRoute } from './entities'
import { getMeta, setMeta } from './db'
import { isOnline } from './network'
import { computeStats } from './computed'
import {
  buildCreatePayload,
  buildUpdatePayload,
  clearSingleton,
  createLocal,
  deleteLocal,
  enqueueMutation,
  formatEntity,
  getLocal,
  getSingleton,
  listLocal,
  updateLocal,
  upsertMany,
  upsertSingleton,
} from './repository'
import { syncOfflineData, pushOutboxOnly } from './sync'
import { toStoreDoc, unwrapEntityResponse, wrapEntityResponse } from './normalize'
import networkClient from '@/lib/api/networkClient'

function queryToObject(query) {
  return Object.fromEntries(query.entries())
}

async function cacheComputedResult(path, data) {
  const cacheKey = `cache:${path.replace(/^\//, '').replace(/\//g, ':')}`
  await setMeta(cacheKey, data)
}

async function readComputedFromNetwork(path, params) {
  const data = await networkClient.get(path, { params })
  await cacheComputedResult(path, data)
  return data
}

async function handleComputedGet(route) {
  const filters = queryToObject(route.query)
  const cacheKey = `cache:${route.path.replace(/^\//, '').replace(/\//g, ':')}`

  if (isOnline()) {
    try {
      return await readComputedFromNetwork(route.path, filters)
    } catch {
      // fall through to local computation
    }
  }

  const cached = await getMeta(cacheKey)
  if (cached && !isOnline()) return cached

  return computeStats(route.computed, filters)
}

async function readFromNetwork(route) {
  const { config, query } = route
  const params = queryToObject(query)
  const data = await networkClient.get(config.path, { params })

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
    return data
  }

  const items = Array.isArray(data) ? data : []
  await upsertMany(
    config.table,
    items.map((doc) => ({ ...toStoreDoc(doc), _syncStatus: 'synced' }))
  )
  return items
}

async function handleGet(route) {
  if (route.computed) {
    return handleComputedGet(route)
  }

  const { config, query, id } = route
  const filters = queryToObject(query)

  if (isOnline()) {
    try {
      if (config.singleton) {
        return await readFromNetwork(route)
      }
      if (id) {
        const doc = await networkClient.get(`${config.path}/${id}`)
        await upsertMany(config.table, [{ ...toStoreDoc(doc), _syncStatus: 'synced' }])
        return formatEntity(config.table, doc)
      }
      return await readFromNetwork(route)
    } catch {
      // fall through to local cache
    }
  }

  if (config.singleton) {
    const doc = await getSingleton(config.table, config.singletonId)
    if (config.wrapKey) {
      return wrapEntityResponse(doc, config.wrapKey)
    }
    return doc ?? { _id: config.singletonId, amount: 0 }
  }

  if (id) {
    const doc = await getLocal(config.table, id)
    if (!doc) throw new Error('Not found')
    return doc
  }

  return listLocal(config.table, filters)
}

async function returnFormatted(config, record) {
  if (!record) return record
  return formatEntity(config.table, record)
}

async function handlePost(route, body) {
  const { config } = route

  if (config.updateOnly) {
    throw new OfflineUnavailableError()
  }

  const payload = buildCreatePayload(config.table ?? route.entity, body)

  let localRecord
  if (config.singleton) {
    localRecord = await upsertSingleton(config.table, config.singletonId, {
      ...body,
      ...payload,
      _syncStatus: 'pending',
    })
  } else {
    localRecord = await createLocal(config.table, { ...body, ...payload })
  }

  await enqueueMutation({
    entity: route.entity,
    operation: 'create',
    entityId: config.singleton ? config.singletonId : localRecord._id,
    payload,
  })

  if (isOnline()) {
    try {
      const { idMap } = await pushOutboxOnly()
      const entityId = config.singleton ? config.singletonId : localRecord._id
      const synced = idMap[entityId] ?? (await getLocal(config.table, entityId))
      if (synced) {
        const formatted = await returnFormatted(config, synced)
        return config.wrapKey ? wrapEntityResponse(formatted, config.wrapKey) : formatted
      }
    } catch {
      // return optimistic local record
    }
  }

  const formatted = await returnFormatted(config, localRecord)
  return config.wrapKey ? wrapEntityResponse(formatted, config.wrapKey) : formatted
}

async function handlePut(route, body) {
  const { config, id } = route
  const entityId = config.singleton ? config.singletonId : id

  if (config.updateOnly) {
    const payload = buildUpdatePayload('userProfile', body, {})
    await enqueueMutation({
      entity: route.entity,
      operation: 'update',
      entityId: 'profile',
      payload,
    })

    if (isOnline()) {
      try {
        await pushOutboxOnly()
        return await networkClient.put(config.path, payload)
      } catch {
        return { user: payload }
      }
    }

    return { user: payload }
  }

  let existing = await getLocal(config.table, entityId)
  if (!existing && config.singleton) {
    existing = await upsertSingleton(config.table, entityId, {
      _id: entityId,
      _syncStatus: 'pending',
    })
  }
  if (!existing) throw new Error('Not found')

  const payload = buildUpdatePayload(config.table, body, existing)
  const updated = await updateLocal(config.table, entityId, { ...body, ...payload })

  await enqueueMutation({
    entity: route.entity,
    operation: 'update',
    entityId,
    payload,
  })

  if (isOnline()) {
    try {
      await pushOutboxOnly()
      const synced = await getLocal(config.table, entityId)
      if (synced) {
        const formatted = await returnFormatted(config, synced)
        return config.wrapKey ? wrapEntityResponse(formatted, config.wrapKey) : formatted
      }
    } catch {
      // return optimistic local record
    }
  }

  const formatted = await returnFormatted(config, updated)
  return config.wrapKey ? wrapEntityResponse(formatted, config.wrapKey) : formatted
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

  if (route.onlineOnly) {
    if (!isOnline()) throw new OfflineUnavailableError()
    return null
  }

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
