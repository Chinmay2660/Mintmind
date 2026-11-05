'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Bell, Check, CheckCheck, Circle, RotateCcw, Settings, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWealth } from '@/lib/wealth/WealthContext'
import { buildNotifications } from '@/lib/wealth/reminders'
import { formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { cn } from '@/lib/utils'
import { useFeatures } from '@/lib/features/FeaturesContext'

const KIND_FEATURE: Record<string, string> = { card: 'credit_cards', statement: 'credit_cards', util: 'credit_cards', premium: 'insurance', expiry: 'insurance', sip: 'mutual_funds', sipend: 'mutual_funds', nav: 'mutual_funds', budget: 'budget_expenses', nobudget: 'budget_expenses', lowbal: 'bank_accounts', stale: 'dashboard', legacy: 'digital_legacy', family: 'family_circle' }

const dot = { high: 'bg-destructive', medium: 'bg-warning', low: 'bg-muted-foreground' } as const
// notification kind -> preference key (Settings → Preferences → Notifications)
const PREF_KEY: Record<string, string> = { card: 'cardDues', statement: 'cardDues', util: 'cardDues', premium: 'premiums', expiry: 'premiums', sip: 'sips', sipend: 'sips', nav: 'navStale', budget: 'budget', nobudget: 'budget', lowbal: 'lowBalance', stale: 'staleValues', legacy: 'legacy', family: 'family' }

type NState = { read: Record<string, number>; dismissed: Record<string, number> }

export function NotificationsMenu() {
  const { data, ready, db } = useWealth()
  const { isEnabled } = useFeatures()
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const state: NState = { read: {}, dismissed: {}, ...(data.meta.find((m: any) => m.key === 'notifState')?.value ?? {}) }
  const prefs = data.meta.find((m: any) => m.key === 'prefs')?.value?.notifications
  const save = (next: NState) => db.meta.put({ key: 'notifState', value: next })

  // The key includes the due date, so a recurring item (next month's premium) comes back as a new, unread notification.
  const all = useMemo(
    () =>
      ready
        ? buildNotifications({ cards: data.cards, policies: data.policies, sips: data.sips, funds: data.funds, expenses: data.expenses, budgets: data.budgets, bankAccounts: data.bankAccounts, assets: data.assets, members: data.members, legacy: data.legacy })
            .filter((n: any) => prefs?.[PREF_KEY[n.kind]] !== false && isEnabled(KIND_FEATURE[n.kind] || 'dashboard'))
            .map((n: any) => ({ ...n, key: `${n.kind}:${n.id}:${n.date ?? new Date().toISOString().slice(0, 7)}` }))
        : [],
    [ready, data.cards, data.policies, data.sips, data.funds, data.expenses, data.budgets, data.bankAccounts, data.assets, data.members, data.legacy, prefs, isEnabled]
  )

  const visible = all.filter((n: any) => !state.dismissed[n.key])
  const cleared = all.length - visible.length
  const unread = visible.filter((n: any) => !state.read[n.key])
  const list = tab === 'unread' ? unread : visible

  const mark = (key: string, isRead: boolean) => {
    const read = { ...state.read }
    if (isRead) read[key] = Date.now(); else delete read[key]
    return save({ ...state, read })
  }
  const markAll = () => save({ ...state, read: { ...state.read, ...Object.fromEntries(visible.map((n: any) => [n.key, Date.now()])) } })
  const dismiss = (key: string) => save({ read: { ...state.read, [key]: state.read[key] ?? Date.now() }, dismissed: { ...state.dismissed, [key]: Date.now() } })
  const clearAll = () => save({ read: { ...state.read, ...Object.fromEntries(visible.map((n: any) => [n.key, Date.now()])) }, dismissed: { ...state.dismissed, ...Object.fromEntries(visible.map((n: any) => [n.key, Date.now()])) } })
  const restore = () => save({ read: state.read, dismissed: {} })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full" aria-label={`Notifications, ${unread.length} unread`}>
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50" disabled={unread.length === 0} onClick={markAll}><CheckCheck className="h-3.5 w-3.5" />Mark all read</Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50" disabled={visible.length === 0} onClick={clearAll}><Trash2 className="h-3.5 w-3.5" />Clear all</Button>
          </div>
        </div>
        <div role="tablist" aria-label="Filter notifications" className="flex gap-1 border-y border-border px-3 py-1.5">
          {(['all', 'unread'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', tab === t ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              {t === 'all' ? `All (${visible.length})` : `Unread (${unread.length})`}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{tab === 'unread' && visible.length > 0 ? 'No unread notifications.' : 'You’re all caught up. No dues or alerts right now.'}</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {list.map((n: any) => {
              const isRead = !!state.read[n.key]
              return (
                <li key={n.key} className={cn('group flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/60', !isRead && 'bg-accent/50')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dot[n.severity as keyof typeof dot])} aria-hidden />
                  <Link href={n.href} onClick={() => !isRead && mark(n.key, true)} className="min-w-0 flex-1 outline-none focus-visible:underline">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{n.module}</span>
                    <span className={cn('block truncate text-sm', isRead ? 'text-muted-foreground' : 'font-medium')}>{n.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {n.date ? `${n.daysLeft < 0 ? 'Overdue since' : n.daysLeft === 0 ? 'Due today' : 'Due'} ${formatDate(n.date)}` : 'Review'}
                      {n.amount ? <> · <Money value={n.amount} /></> : null}
                    </span>
                  </Link>
                  <div className="flex shrink-0 gap-0.5">
                    <Button size="icon" variant="ghost" className={cn('h-7 w-7 transition-colors', isRead ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : 'text-foreground hover:bg-muted')} aria-label={isRead ? 'Mark as unread' : 'Mark as read'} title={isRead ? 'Mark as unread' : 'Mark as read'} onClick={() => mark(n.key, !isRead)}>{isRead ? <Circle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Dismiss" title="Dismiss" onClick={() => dismiss(n.key)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <DropdownMenuSeparator className="my-0" />
        <div className="flex items-center justify-between px-3 py-2 text-xs">
          {cleared > 0 ? <button className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" onClick={restore}><RotateCcw className="h-3 w-3" />Restore {cleared} cleared</button> : <span className="text-muted-foreground">Reminders from all your modules</span>}
          <Link href="/dashboard/settings" className="inline-flex items-center gap-1 text-primary hover:underline"><Settings className="h-3 w-3" />Preferences</Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
