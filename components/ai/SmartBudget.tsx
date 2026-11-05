'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
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
    <Panel title={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" />Daily budget assistant</span>} description={`${b.label}, day ${b.dayToday} of ${b.days}${isDemo ? ' · demo: simulated from sample data' : ''}`}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div><dt className="text-xs text-muted-foreground">Expected till today</dt><dd className="font-semibold"><Money value={b.expectedTillToday} /></dd></div>
        <div><dt className="text-xs text-muted-foreground">Actual till today</dt><dd className="font-semibold"><Money value={b.spent} /></dd></div>
        <div><dt className="text-xs text-muted-foreground">You can spend today</dt><dd className="font-semibold text-primary"><Money value={b.allowanceToday} /></dd><dd className="text-[11px] text-muted-foreground">to stay on pace</dd></div>
        <div><dt className="text-xs text-muted-foreground">Month-end forecast</dt><dd className="font-semibold"><Money value={b.projected} /></dd><dd className="text-[11px] text-muted-foreground">estimate</dd></div>
        <div><dt className="text-xs text-muted-foreground">Deviation</dt><dd className={b.variance > 0 ? 'font-semibold text-destructive' : 'font-semibold text-success'}>{b.variance > 0 ? 'Over ' : 'Under '}<Money value={Math.abs(b.variance)} /></dd></div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">Today&apos;s allowance follows your planned pace. It is a different number from the remaining budget ({formatINR(b.remaining)}) or remaining budget per day ({formatINR(b.safeDailySpend)}).</p>
      {(extras.unusual.length > 0 || extras.recurring.length > 0 || extras.adjust.length > 0) && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-3">
          {extras.unusual.length > 0 && <div><h4 className="mb-1.5 text-sm font-semibold">Unusual spending</h4><ul className="space-y-1.5 text-xs text-muted-foreground">{extras.unusual.map((u, i) => <li key={i}>{u.text}</li>)}</ul></div>}
          {extras.recurring.length > 0 && <div><h4 className="mb-1.5 text-sm font-semibold">Looks recurring</h4><ul className="space-y-1.5 text-xs text-muted-foreground">{extras.recurring.map((r) => <li key={r.merchant}>{r.merchant} · {formatINR(r.amount)} around day {r.dayOfMonth} ({r.months} months){r.likelySubscription ? ' · subscription' : ''}</li>)}</ul></div>}
          {extras.adjust.length > 0 && <div><h4 className="mb-1.5 text-sm font-semibold">Suggested limit changes</h4><ul className="space-y-1.5 text-xs text-muted-foreground">{extras.adjust.map((a) => <li key={a.category}><span className="text-foreground">{a.category}: {a.from ? formatINR(a.from) : 'no limit'} → {formatINR(a.to)}.</span> {a.reason}</li>)}</ul><p className="mt-1 text-[11px] text-muted-foreground">Suggestions only. Change limits yourself under Budget.</p></div>}
        </div>
      )}
    </Panel>
  )
}
