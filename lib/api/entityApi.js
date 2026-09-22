import { ENTITIES } from '@/lib/offline/entities'
import request from '@/lib/api/request'

export function getEntityConfig(tableName) {
  return ENTITIES[tableName] ?? null
}

export function entityApiPath(tableName) {
  const config = getEntityConfig(tableName)
  if (!config) throw new Error(`Unknown entity table: ${tableName}`)
  return `/api${config.path}`
}

export async function fetchEntityList(tableName, filters = {}) {
  const config = getEntityConfig(tableName)
  if (!config) return []

  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  )
  const res = await request.get(entityApiPath(tableName), { params })
  const data = res.data

  if (Array.isArray(data)) return data
  if (config.wrapKey && data?.[config.wrapKey]) return [data[config.wrapKey]]
  return data?.data ?? []
}

export async function fetchEntityRecord(tableName, id) {
  const config = getEntityConfig(tableName)
  if (!config) throw new Error(`Unknown entity table: ${tableName}`)

  if (config.singleton) {
    const res = await request.get(entityApiPath(tableName))
    return config.wrapKey ? res.data?.[config.wrapKey] ?? res.data : res.data
  }

  const res = await request.get(`${entityApiPath(tableName)}/${id}`)
  return res.data
}
