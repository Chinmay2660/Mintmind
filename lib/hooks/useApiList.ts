'use client'

import { useCallback, useEffect, useState } from 'react'
import request from '@/lib/api/request'

export function useApiList<T = any>(endpoint: string, enabled = true) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const res = await request.get(endpoint)
    const items = Array.isArray(res) ? res : res?.data ?? []
    setData(items)
    return items
  }, [endpoint])

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    setLoading(true)
    reload().finally(() => setLoading(false))
  }, [reload, enabled])

  return { data, loading, reload }
}
