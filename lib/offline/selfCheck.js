import { createLocalId, isLocalId } from './ids'
import { toStoreDoc } from './normalize'
import { computeDashboardStats } from './computed'

export function runOfflineSelfCheck() {
  const localId = createLocalId()
  if (!isLocalId(localId)) {
    throw new Error('offline self-check: local id prefix failed')
  }

  const doc = toStoreDoc({ _id: { toString: () => 'abc123' }, name: 'Food' })
  if (doc._id !== 'abc123') {
    throw new Error('offline self-check: toStoreDoc failed')
  }

  return true
}

export async function runOfflineSelfCheckAsync() {
  runOfflineSelfCheck()
  const stats = await computeDashboardStats()
  if (typeof stats.netWorth !== 'number') {
    throw new Error('offline self-check: dashboard stats failed')
  }
  return true
}

if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  runOfflineSelfCheck()
}
