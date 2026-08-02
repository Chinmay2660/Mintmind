'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { getMeta, getPendingCount } from '@/lib/offline/db'
import { initAppResumeSync, initNetworkMonitoring, isOnline, onConnectivityChange } from '@/lib/offline/network'
import { syncOfflineData } from '@/lib/offline/sync'
import type { OfflineContextValue, OfflineProviderProps } from '@/types/offline'

const OfflineContext = createContext<OfflineContextValue | null>(null)

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { user } = useAuth()
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const refreshMeta = useCallback(async () => {
    setPendingCount(await getPendingCount())
    setLastSyncedAt(await getMeta('lastSyncedAt'))
  }, [])

  const syncNow = useCallback(async () => {
    if (!user) return
    setSyncing(true)
    try {
      await syncOfflineData()
      await refreshMeta()
    } finally {
      setSyncing(false)
    }
  }, [user, refreshMeta])

  useEffect(() => {
    let cancelled = false

    initNetworkMonitoring().then(() => {
      if (!cancelled) setOnline(isOnline())
    })

    return onConnectivityChange((nextOnline) => {
      if (!cancelled) setOnline(nextOnline)
    })
  }, [])

  useEffect(() => {
    if (!user) {
      setPendingCount(0)
      setLastSyncedAt(null)
      return
    }
    syncNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user || !online) return
    syncNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  useEffect(() => {
    if (!user) return
    let cleanup = () => {}
    initAppResumeSync(syncNow).then((dispose) => {
      cleanup = dispose
    })
    return () => cleanup()
  }, [user, syncNow])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(refreshMeta, 5000)
    return () => clearInterval(interval)
  }, [user, refreshMeta])

  return (
    <OfflineContext.Provider value={{ online, pendingCount, lastSyncedAt, syncing, syncNow }}>
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider')
  }
  return context
}
