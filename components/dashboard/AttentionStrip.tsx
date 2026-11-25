'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { AlertCircle, ChevronRight, Clock } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { buildNotifications } from '@/lib/wealth/reminders'
import { KIND_FEATURE, PREF_KEY } from '@/components/shell/NotificationsMenu'

const MAX = 3

/**
 * "Needs attention": the few things from the reminders that are worth acting on now (dues, premiums, maturities, budget, low
 * balances), most urgent first. It reads the same reminders as the bell, honours the same switches and dismissals, and shows
 * nothing at all when there is nothing to do. Amber, never red: a due date is information, not an alarm.
 */
export function AttentionStrip() {
  const { data, ready } = useWealth()
  const { isEnabled } = useFeatures()
  const items = useMemo(() => {
    if (!ready) return []
    const state = { dismissed: {}, ...(data.meta.find((m: any) => m.key === 'notifState')?.value ?? {}) } as { dismissed: Record<string, boolean> }
    const prefs = data.meta.find((m: any) => m.key === 'prefs')?.value?.notifications
    const month = new Date().toISOString().slice(0, 7)
    const list = buildNotifications({ cards: data.cards, policies: data.policies, sips: data.sips, funds: data.funds, expenses: data.expenses, budgets: data.budgets, bankAccounts: data.bankAccounts, assets: data.assets, members: data.members, legacy: data.legacy } as any)
      .filter((n: any) => prefs?.[PREF_KEY[n.kind]] !== false && isEnabled(KIND_FEATURE[n.kind] || 'dashboard'))
      .map((n: any) => ({ ...n, key: `${n.kind}:${n.id}:${n.date ?? month}` }))
      .filter((n: any) => !state.dismissed[n.key])
    // what is urgent first; "low" items (statement days, stale values) stay in the bell
    const urgent = list.filter((n: any) => n.severity !== 'low')
    return (urgent.length ? urgent : list).slice(0, MAX)
  }, [ready, data, isEnabled])

  if (items.length === 0) return null
  return (
    <section aria-label="Needs attention" className="rounded-xl border border-warning/40 bg-warning/5 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertCircle className="h-4 w-4 text-warning" aria-hidden />Needs attention</h2>
      <ul className="mt-2 divide-y divide-border/70">
        {items.map((n: any) => (
          <li key={n.key}>
            <Link href={n.href || '/dashboard'} className="flex min-h-11 items-center gap-3 rounded-md py-2 text-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
              <span className="min-w-0 flex-1 truncate">{n.title}</span>
              {typeof n.daysLeft === 'number' && n.daysLeft >= 0 && n.date && <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" aria-hidden />{n.daysLeft === 0 ? 'today' : n.daysLeft === 1 ? 'tomorrow' : `${n.daysLeft} days`}</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
