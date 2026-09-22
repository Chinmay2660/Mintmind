'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchEntityList, fetchEntityRecord } from '@/lib/api/entityApi'

type LocalFilters = Record<string, string | number | boolean | undefined>

export function useLocalList<T = any>(
  tableName: string,
  userId?: string,
  filters?: LocalFilters,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const filterKey = JSON.stringify(filters ?? {})

  const reload = useCallback(async () => {
    const rows = await fetchEntityList(tableName, filters ?? {})
    setData(rows as T[])
    return rows as T[]
  }, [tableName, filterKey])

  useEffect(() => {
    if (!userId || !enabled) {
      setLoading(false)
      if (!userId) setData([])
      return
    }

    let cancelled = false
    setLoading(true)
    reload().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId, reload, enabled])

  return { data, loading, reload }
}

export function useLocalRecord<T = any>(tableName: string, id?: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  const reload = useCallback(async () => {
    if (!id) {
      setData(null)
      return null
    }
    const row = await fetchEntityRecord(tableName, id)
    setData(row as T)
    return row as T
  }, [tableName, id])

  useEffect(() => {
    if (!id) {
      setData(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    reload().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [id, reload])

  return { data, loading, reload }
}

export function useLocalSingleton<T = any>(
  tableName: string,
  singletonId: string,
  userId?: string
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const row = await fetchEntityRecord(tableName, singletonId)
    setData(row as T)
    return row as T
  }, [tableName, singletonId])

  useEffect(() => {
    if (!userId) {
      setData(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    reload().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [userId, reload])

  return { data, loading, reload }
}
