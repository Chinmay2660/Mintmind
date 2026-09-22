'use client'

import { useRegisterRefresh } from '@/contexts/RefreshContext'

/** Pull-to-refresh: reload data from the server. */
export function useSyncedRefresh(reload: () => Promise<unknown>) {
  useRegisterRefresh(async () => {
    await reload()
  })
}
