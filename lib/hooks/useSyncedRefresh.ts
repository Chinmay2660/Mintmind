'use client'

import { useRegisterRefresh } from '@/contexts/RefreshContext'
import { useOffline } from '@/contexts/OfflineContext'

/** Pull-to-refresh: force server sync then reload local cache. */
export function useSyncedRefresh(reload: () => Promise<unknown>) {
  const { syncNow } = useOffline()

  useRegisterRefresh(async () => {
    await syncNow({ force: true })
    await reload()
  })
}
