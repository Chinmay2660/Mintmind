'use client'

import { useCallback, useMemo } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'

export interface DashboardBlock { id: string; label: string; /** hidden until the person turns it on in Settings (the heavy chart sections) */ off?: boolean }

/** The sections of the Overview that can be shown, hidden, reordered and resized. Shared by the dashboard and Settings. */
export const DASHBOARD_BLOCKS: DashboardBlock[] = [
  // The Overview is a short list: each row opens its own page, where the detail is. The chart sections below are off until wanted.
  { id: 'accounts', label: 'Your money: one row for each area' },
  { id: 'payments', label: 'Coming up and recent transactions' },
  { id: 'summary', label: 'Account summary cards', off: true },
  { id: 'networth', label: 'Net worth chart and financial health', off: true },
  { id: 'allocation', label: 'Asset allocation and liabilities charts', off: true },
  { id: 'spending', label: 'Income vs expenses and budget pace', off: true },
]

/** The order and visibility of the dashboard sections, saved per profile in the local database. */
export function useDashboardLayout(blocks: DashboardBlock[]) {
  const { data, db } = useWealth()
  const saved = data.meta.find((m: any) => m.key === 'dashboardLayout')?.value as { order?: string[]; hidden?: string[]; half?: string[] } | undefined

  const layout = useMemo(() => {
    const ids = blocks.map((b) => b.id)
    // keep the saved order, drop sections that no longer exist, and put any new section at the end
    const order = [...(saved?.order ?? []).filter((id) => ids.includes(id)), ...ids.filter((id) => !(saved?.order ?? []).includes(id))]
    // a section the person has never seen (no saved choice yet) starts hidden if it is a chart section
    const seen = new Set([...(saved?.order ?? []), ...(saved?.hidden ?? [])])
    const hidden = saved ? [...(saved.hidden ?? []).filter((id) => ids.includes(id)), ...blocks.filter((b) => b.off && !seen.has(b.id)).map((b) => b.id)] : blocks.filter((b) => b.off).map((b) => b.id)
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
