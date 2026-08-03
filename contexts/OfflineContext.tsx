'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { getMeta, getPendingCount } from '@/lib/offline/db'
import { initNetworkMonitoring, isOnline, onConnectivityChange } from '@/lib/offline/network'
import { pushOutboxOnly, syncOfflineData } from '@/lib/offline/sync'
import type { OfflineContextValue, OfflineProviderProps } from '@/types/offline'

const OfflineContext = createContext<OfflineContextValue | null>(null)

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { user } = useAuth()
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const wasOnlineRef = useRef(true)

  const refreshMeta = useCallback(async () => {
    setPendingCount(await getPendingCount())
    setLastSyncedAt(await getMeta('lastSyncedAt'))
  }, [])

  const syncNow = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user) return
      setSyncing(true)
      try {
        await syncOfflineData({ force: options?.force ?? false })
        await refreshMeta()
      } finally {
        setSyncing(false)
      }
    },
    [user, refreshMeta]
  )

  useEffect(() => {
    let cancelled = false

    initNetworkMonitoring().then(() => {
      if (!cancelled) setOnline(isOnline())
    })

    return onConnectivityChange((nextOnline) => {
      if (!cancelled) setOnline(nextOnline)
    })
  }, [])

  // First login: one full pull when cache is empty. Otherwise read local only.
  useEffect(() => {
    if (!user?.id) {
      setPendingCount(0)
      setLastSyncedAt(null)
      return
    }

    let cancelled = false

    const bootstrap = async () => {
      await refreshMeta()
      if (cancelled || !online) return

      const last = await getMeta('lastSyncedAt')
      if (!last) {
        await syncNow({ force: true })
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Reconnect: push pending changes only — no full API pull.
  useEffect(() => {
    if (!user?.id || !online) {
      wasOnlineRef.current = online
      return
    }

    const cameOnline = !wasOnlineRef.current && online
    wasOnlineRef.current = online
    if (!cameOnline) return

    let cancelled = false

    const push = async () => {
      const last = await getMeta('lastSyncedAt')
      if (cancelled || !last) return
      await pushOutboxOnly()
      await refreshMeta()
    }

    push()

    return () => {
      cancelled = true
    }
  }, [online, user?.id, refreshMeta])

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
