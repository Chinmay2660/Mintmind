import { createLocalId, isLocalId } from './ids'
import { toStoreDoc } from './normalize'
import { computeDashboardStats } from './computed'
import { clearCachedUser, getCachedUser, setCachedUser } from './session'

export function runOfflineSelfCheck() {
  const localId = createLocalId()
  if (!isLocalId(localId)) {
    throw new Error('offline self-check: local id prefix failed')
  }

  const doc = toStoreDoc({ _id: { toString: () => 'abc123' }, name: 'Food' })
  if (doc._id !== 'abc123') {
    throw new Error('offline self-check: toStoreDoc failed')
  }

  if (typeof window !== 'undefined') {
    const sampleUser = { id: 'user-1', email: 'offline@example.com' }
    setCachedUser(sampleUser)
    if (getCachedUser()?.id !== 'user-1') {
      throw new Error('offline self-check: session cache failed')
    }
    clearCachedUser()
    if (getCachedUser() !== null) {
      throw new Error('offline self-check: session clear failed')
    }
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

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  runOfflineSelfCheck()
}
