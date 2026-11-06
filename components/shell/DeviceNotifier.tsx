'use client'

import { useEffect, useRef } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { buildNotifications } from '@/lib/wealth/reminders'
import { showDueNotifications } from '@/lib/notify/device'
import { KIND_FEATURE, PREF_KEY } from '@/components/shell/NotificationsMenu'

/** Renders nothing. While the app is open and the user has opted in, surfaces urgent reminders as device notifications. */
export function DeviceNotifier() {
  const { data, ready } = useWealth()
  const { isEnabled } = useFeatures()
  const latest = useRef<() => any[]>(() => [])
  latest.current = () => {
    const prefs = data.meta.find((m: any) => m.key === 'prefs')?.value?.notifications
    const dismissed = data.meta.find((m: any) => m.key === 'notifState')?.value?.dismissed ?? {}
    return buildNotifications({ cards: data.cards, policies: data.policies, sips: data.sips, funds: data.funds, expenses: data.expenses, budgets: data.budgets, bankAccounts: data.bankAccounts, assets: data.assets, members: data.members, legacy: data.legacy })
      .filter((n: any) => prefs?.[PREF_KEY[n.kind]] !== false && isEnabled(KIND_FEATURE[n.kind] || 'dashboard'))
      .map((n: any) => ({ ...n, key: `${n.kind}:${n.id}:${n.date ?? new Date().toISOString().slice(0, 7)}` }))
      .filter((n: any) => !dismissed[n.key])
  }
  useEffect(() => {
    if (!ready) return
    const run = () => { showDueNotifications(latest.current()).catch(() => {}) }
    run()
    const t = setInterval(run, 30 * 60 * 1000)
    const vis = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [ready])
  return null
}
