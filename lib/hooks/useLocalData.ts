'use client'

import { useCallback, useEffect, useState } from 'react'
import { useOffline } from '@/contexts/OfflineContext'
import { listLocal, getLocal, getSingleton } from '@/lib/offline/repository'

type LocalFilters = Record<string, string | number | boolean | undefined>

export function useLocalList<T = any>(
  tableName: string,
  userId?: string,
  filters?: LocalFilters,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true
  const { syncing, lastSyncedAt } = useOffline()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const filterKey = JSON.stringify(filters ?? {})

  const reload = useCallback(async () => {
    const rows = await listLocal(tableName, filters ?? {})
    setData(rows as T[])
    return rows as T[]
  }, [tableName, filterKey])

  useEffect(() => {
    if (!userId || !enabled) {
      setLoading(false)
      if (!userId) setData([])
      return
    }
    if (syncing) return

    let cancelled = false
    setLoading(true)
    reload().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId, syncing, lastSyncedAt, reload, enabled])

  return { data, loading, reload }
}

export function useLocalRecord<T = any>(tableName: string, id?: string) {
  const { syncing, lastSyncedAt } = useOffline()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  const reload = useCallback(async () => {
    if (!id) {
      setData(null)
      return null
    }
    const row = await getLocal(tableName, id)
    setData(row as T)
    return row as T
  }, [tableName, id])

  useEffect(() => {
    if (!id) {
      setData(null)
      setLoading(false)
      return
    }
    if (syncing) return

    let cancelled = false
    setLoading(true)
    reload().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [id, syncing, lastSyncedAt, reload])

  return { data, loading, reload }
}

export function useLocalSingleton<T = any>(
  tableName: string,
  singletonId: string,
  userId?: string
) {
  const { syncing, lastSyncedAt } = useOffline()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const row = await getSingleton(tableName, singletonId)
    setData(row as T)
    return row as T
  }, [tableName, singletonId])

  useEffect(() => {
    if (!userId) {
      setData(null)
      setLoading(false)
      return
    }
    if (syncing) return

    let cancelled = false
    setLoading(true)
    reload().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId, syncing, lastSyncedAt, reload])

  return { data, loading, reload }
}
