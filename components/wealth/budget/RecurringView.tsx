'use client'

import { useMemo, useState } from 'react'
import { Repeat } from 'lucide-react'
import { detectRecurring } from '@/lib/ai/budgetAI'
import { daysInMonth, toISO } from '@/lib/wealth/calc'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from '../Money'
import { cn } from '@/lib/utils'
import { Empty, Panel, Stat } from '../kit'

interface Props { expenses: any[] }

/** The next time a monthly payment is expected: this month if its day has not passed, otherwise next month. */
function nextDue(day: number, today: Date) {
  const clamp = (y: number, m: number) => new Date(y, m, Math.min(day, daysInMonth(y, m + 1)))
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let d = clamp(t.getFullYear(), t.getMonth())
  if (d < t) d = clamp(t.getFullYear(), t.getMonth() + 1)
  return d
}
const title = (k: string) => k.replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * Payments that repeat every month, found in the expenses you recorded: same payee or amount, similar day, three months running.
 * Nothing here is guessed from a single payment, and a payment that stops showing up drops off by itself.
 */
export function RecurringView({ expenses }: Props) {
  const [yearly, setYearly] = useState(false)
  const today = useMemo(() => new Date(), [])
  const rows = useMemo(() => detectRecurring(expenses).map((r: any) => ({ ...r, next: nextDue(r.dayOfMonth, today) })).sort((a: any, b: any) => +a.next - +b.next), [expenses, today])
  const monthly = rows.reduce((n: number, r: any) => n + r.amount, 0)
  const soon = rows.filter((r: any) => +r.next - +today <= 7 * 86400000)
  const subs = rows.filter((r: any) => r.likelySubscription)

  if (!rows.length) return <Empty title="No recurring payments found yet" description="A payment shows up here once it has been recorded in three months in a row, on a similar day and for a similar amount." />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={yearly ? 'Per year' : 'Per month'} info="The total of every recurring payment found in your expenses." value={<Money value={yearly ? monthly * 12 : monthly} />} />
        <Stat label="Recurring payments" value={rows.length} />
        <Stat label="Subscriptions" info="Payees that look like subscriptions, such as streaming, software or memberships." value={subs.length} />
        <Stat label="Due in 7 days" value={soon.length} hint={soon.length ? <Money value={soon.reduce((n: number, r: any) => n + r.amount, 0)} /> : undefined} />
      </div>

      <Panel title="Coming up" description="Sorted by the next expected date. The date is when it usually falls, not a promise from the bank."
        action={<div role="group" aria-label="Show cost per" className="inline-flex rounded-lg border border-border bg-muted p-0.5">{[false, true].map((y) => <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => setYearly(y)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', yearly === y ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>{y ? 'Yearly' : 'Monthly'}</button>)}</div>}>
        <ul className="divide-y divide-border">
          {rows.map((r: any) => {
            const days = Math.round((+r.next - +new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
            return (
              <li key={r.merchant + r.amount} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary" aria-hidden><Repeat className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{title(r.merchant)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.category} · around day {r.dayOfMonth} · {r.months} months in a row{r.likelySubscription ? ' · subscription' : ''}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums"><Money value={yearly ? r.amount * 12 : r.amount} /></span>
                  <span className="block text-xs text-muted-foreground">{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${formatDate(toISO(r.next))} · ${days}d`}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground tabular-nums">Total {formatINR(yearly ? monthly * 12 : monthly)} {yearly ? 'a year' : 'a month'}.</p>
      </Panel>
    </div>
  )
}
