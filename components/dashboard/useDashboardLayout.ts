'use client'

import { useCallback, useMemo } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'

export interface DashboardBlock { id: string; label: string }

/** The order and visibility of the dashboard sections, saved per profile in the local database. */
export function useDashboardLayout(blocks: DashboardBlock[]) {
  const { data, db } = useWealth()
  const saved = data.meta.find((m: any) => m.key === 'dashboardLayout')?.value as { order?: string[]; hidden?: string[]; half?: string[] } | undefined

  const layout = useMemo(() => {
    const ids = blocks.map((b) => b.id)
    // keep the saved order, drop sections that no longer exist, and put any new section at the end
    const order = [...(saved?.order ?? []).filter((id) => ids.includes(id)), ...ids.filter((id) => !(saved?.order ?? []).includes(id))]
    const hidden = (saved?.hidden ?? []).filter((id) => ids.includes(id))
    const half = (saved?.half ?? []).filter((id) => ids.includes(id))
    return { order, hidden, half }
  }, [saved, blocks])

  const write = useCallback(async (next: { order: string[]; hidden: string[]; half: string[] }) => {
    if (db) await db.meta.put({ key: 'dashboardLayout', value: next })
  }, [db])

  return {
    order: layout.order,
    hidden: layout.hidden,
    half: layout.half,
    isCustom: !!saved,
    setOrder: (order: string[]) => write({ order, hidden: layout.hidden, half: layout.half }),
    toggleHalf: (id: string) => write({ order: layout.order, hidden: layout.hidden, half: layout.half.includes(id) ? layout.half.filter((h) => h !== id) : [...layout.half, id] }),
    toggle: (id: string) => write({ order: layout.order, half: layout.half, hidden: layout.hidden.includes(id) ? layout.hidden.filter((h) => h !== id) : [...layout.hidden, id] }),
    reset: async () => { if (db) await db.meta.delete('dashboardLayout') },
  }
}
