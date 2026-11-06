'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { detectRecurring, suggestBudgetAdjustments, unusualSpending } from '@/lib/ai/budgetAI'
import { formatINR } from '@/lib/wealth/format'
import { Panel } from '@/components/wealth/kit'
import { Money } from '@/components/wealth/Money'
import { useAi } from './useAi'

/** Smart budget: daily allowance (distinct from remaining budget), forecast, unusual spending, recurring items and suggested limits. */
export function SmartBudget() {
  const { facts, data, isDemo } = useAi()
  const b = facts?.budget
  const extras = useMemo(() => (facts ? { recurring: detectRecurring(data.expenses).slice(0, 4), unusual: unusualSpending(facts, data.expenses).slice(0, 3), adjust: suggestBudgetAdjustments(facts).slice(0, 3) } : null), [facts, data.expenses])
  if (!b || !extras) return null
  return (
    <Panel title={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" />Daily budget assistant</span>}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div><dt className="text-xs text-muted-foreground">Expected till today</dt><dd className="font-semibold"><Money value={b.expectedTillToday} /></dd></div>
        <div><dt className="text-xs text-muted-foreground">Actual till today</dt><dd className="font-semibold"><Money value={b.spent} /></dd></div>
        <div><dt className="text-xs text-muted-foreground">You can spend today</dt><dd className="font-semibold text-primary"><Money value={b.allowanceToday} /></dd><dd className="text-[11px] text-muted-foreground">to stay on pace</dd></div>
        <div><dt className="text-xs text-muted-foreground">Month-end forecast</dt><dd className="font-semibold"><Money value={b.projected} /></dd><dd className="text-[11px] text-muted-foreground">estimate</dd></div>
        <div><dt className="text-xs text-muted-foreground">Deviation</dt><dd className={b.variance > 0 ? 'font-semibold text-destructive' : 'font-semibold text-success'}>{b.variance > 0 ? 'Over ' : 'Under '}<Money value={Math.abs(b.variance)} /></dd></div>
      </dl>
      {(extras.unusual.length > 0 || extras.recurring.length > 0 || extras.adjust.length > 0) && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-3">
          {extras.unusual.length > 0 && <div><h4 className="mb-1.5 text-sm font-semibold">Unusual spending</h4><ul className="space-y-1.5 text-xs text-muted-foreground">{extras.unusual.map((u, i) => <li key={i}>{u.text}</li>)}</ul></div>}
          {extras.recurring.length > 0 && <div><h4 className="mb-1.5 text-sm font-semibold">Looks recurring</h4><ul className="space-y-1.5 text-xs text-muted-foreground">{extras.recurring.map((r) => <li key={r.merchant}>{r.merchant} · {formatINR(r.amount)} around day {r.dayOfMonth} ({r.months} months){r.likelySubscription ? ' · subscription' : ''}</li>)}</ul></div>}
          {extras.adjust.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Suggested limit changes</h4>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {extras.adjust.map((a) => {
                  const up = a.to > a.from
                  return (
                    <li key={a.category} title={a.reason} className="grid grid-cols-[minmax(0,1fr)_5.5rem_1rem_5.5rem] items-center gap-x-2 px-3 py-2.5 text-sm tabular-nums">
                      <span className="min-w-0"><span className="block truncate font-medium">{a.category}</span><span className="block truncate text-xs text-muted-foreground">Avg {formatINR(a.avg ?? 0)} / month</span></span>
                      <span className="text-right text-muted-foreground">{a.from ? formatINR(a.from) : 'No limit'}</span>
                      <span aria-hidden className={cn('text-center', up ? 'text-destructive' : 'text-success')}>{up ? '↑' : '↓'}</span>
                      <span className="text-right font-semibold">{formatINR(a.to)}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">Based on the last 3 months. Change limits under Budget.</p>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
