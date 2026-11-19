'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export const PAGE_SIZES = [10, 25, 50] as const

/**
 * Local pagination over an array that is already in memory (most of this app's data lives on the device).
 * The page resets whenever `resetKey` changes (a filter, a search), and clamps if the list shrinks.
 */
export function usePagination<T>(items: T[], opts: { pageSize?: number; resetKey?: unknown } = {}) {
  const [pageSize, setPageSize] = useState<number>(opts.pageSize ?? 10)
  const [page, setPage] = useState(1)
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => { setPage(1) }, [opts.resetKey, pageSize])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  const slice = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize])
  return { page, setPage, pageSize, setPageSize, pageCount, total, slice, from: total === 0 ? 0 : (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total) }
}

/**
 * Server-side pagination: the server returns one page at a time and the total.
 * `fetchPage` receives { page, pageSize } and returns { items, total }. It runs again when the page, size or `resetKey` changes.
 */
export function useServerPagination<T>(fetchPage: (p: { page: number; pageSize: number }) => Promise<{ items: T[]; total: number }>, opts: { pageSize?: number; resetKey?: unknown; enabled?: boolean } = {}) {
  const [pageSize, setPageSize] = useState<number>(opts.pageSize ?? 10)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)
  const enabled = opts.enabled ?? true
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => { setPage(1) }, [opts.resetKey, pageSize])
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true); setError(false)
    fetchPage({ page, pageSize })
      .then((r) => { if (!cancelled) { setItems(r.items); setTotal(r.total) } })
      .catch(() => { if (!cancelled) { setItems([]); setTotal(0); setError(true) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // fetchPage is deliberately not a dependency: callers pass an inline function, and `resetKey` covers what it reads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, opts.resetKey, enabled, tick])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => { if (enabled && !loading && page > pageCount) setPage(pageCount) }, [enabled, loading, page, pageCount])
  return { page, setPage, pageSize, setPageSize, pageCount, total, items, loading, error, refresh, from: total === 0 ? 0 : (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total) }
}
