'use client'

import { Panel, Progress } from '@/components/wealth/kit'
import { Money } from '@/components/wealth/Money'
import { incomeProgress } from '@/lib/wealth/incomeBudget'
import { cn } from '@/lib/utils'

export interface IncomePlan { total: number; categories: Record<string, number> }

/** Expected against received, with a row for each income category. Shown on the Overview once an income budget exists. */
export function IncomeProgressPanel({ plan, bankTxns, ym }: { plan: IncomePlan | null; bankTxns: any[]; ym: string }) {
  if (!plan) return null
  const p = incomeProgress({ plan, bankTxns, ym })
  return (
    <Panel title="Income" description="What you expected against what has come in this month.">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm"><strong className="text-lg font-semibold tabular-nums text-income"><Money value={p.received} /></strong> <span className="text-muted-foreground">of <Money value={p.expected} /> expected</span></p>
        {p.pct != null && <span className="text-sm font-semibold tabular-nums">{p.pct}%</span>}
      </div>
      <Progress value={Math.min(100, p.pct ?? 0)} tone="primary" label="Income received" />
      <ul className="mt-3 divide-y divide-border">
        {p.rows.map((r) => (
          <li key={r.category} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0 truncate">{r.category}</span>
            <span className={cn('shrink-0 tabular-nums', r.received > 0 ? 'text-income' : 'text-muted-foreground')}><Money value={r.received} compact />{r.expected > 0 && <span className="text-muted-foreground"> / <Money value={r.expected} compact /></span>}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
