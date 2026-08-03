import type { ReactNode } from 'react'

export interface OfflineContextValue {
  online: boolean
  pendingCount: number
  lastSyncedAt: string | null
  syncing: boolean
  syncNow: (options?: { force?: boolean }) => Promise<void>
}

export interface OfflineProviderProps {
  children: ReactNode
}
