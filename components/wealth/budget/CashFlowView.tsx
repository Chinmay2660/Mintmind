'use client'

import { useMemo, useState } from 'react'
import { cashFlow } from '@/lib/wealth/cashflow'
import { formatINR } from '@/lib/wealth/format'
import { Money } from '../Money'
import { Metric, Panel, Stat } from '../kit'
import { cn } from '@/lib/utils'

const label = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleString('en-IN', { month: 'short' })

/** Money in against money out, month by month, and where it came from and went. Transfers between your accounts are left out. */
export function CashFlowView({ list, ym }: { list: any[]; ym: string }) {
  const [months, setMonths] = useState<6 | 12>(6)
  const r = useMemo(() => cashFlow(list, ym, months), [list, ym, months])
  const max = Math.max(1, ...r.series.map((x) => Math.max(x.income, x.expense)))
  const [prev, cur] = r.series.slice(-2)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-4 border-b border-border pb-5">
        <Stat label="Money in" value={<Money value={r.totalIn} />} hint={`${months} months`} />
        <Stat label="Money out" value={<Money value={r.totalOut} />} hint={`${months} months`} />
        <Stat label="Kept" info="Money in minus money out over the period. Negative means you spent more than came in." value={<span className={cn(r.net < 0 && 'text-destructive')}><Money value={r.net} signed /></span>} hint={`${formatINR(r.avgNet)} a month on average`} />
        <Stat label="Net this month vs last" info="The month's money in minus money out, compared with the month before." value={<Metric amount={cur ? cur.net - (prev?.net ?? 0) : null} className="text-lg font-semibold sm:text-xl" hint="Needs two months" />} hint={cur?.savingsRate != null ? `${cur.savingsRate}% of income kept` : 'No income recorded'} />
      </div>

      <Panel title="Month by month" description="Bars use a square-root scale, so a very large month does not shrink the others to nothing. Compare the lengths within a month, and use the figure on the right for the exact amount kept." action={<div className="inline-flex rounded-lg border border-border bg-muted p-0.5">{([6, 12] as const).map((n) => <button key={n} type="button" aria-pressed={months === n} onClick={() => setMonths(n)} className={cn('rounded-md px-3 py-1 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring', months === n ? 'bg-card shadow-card' : 'text-muted-foreground')}>{n} months</button>)}</div>}>
        <ul className="space-y-3">
          {r.series.map((m) => (
            <li key={m.ym} style={{ display: 'grid', gridTemplateColumns: '2.75rem minmax(0, 1fr) auto', alignItems: 'center', columnGap: 12 }} className="text-xs">
              <span className="font-bold uppercase text-muted-foreground">{label(m.ym)}</span>
              <span className="space-y-1">
                <span className="block h-2 rounded-full bg-success" style={{ width: `${Math.sqrt(m.income / max) * 100}%`, minWidth: m.income ? 4 : 0 }} />
                <span className="block h-2 rounded-full bg-destructive" style={{ width: `${Math.sqrt(m.expense / max) * 100}%`, minWidth: m.expense ? 4 : 0 }} />
              </span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={cn('font-semibold tabular-nums', m.net < 0 && 'text-destructive')}>{m.net < 0 ? '-' : '+'}{formatINR(Math.abs(m.net))}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-success" />In</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-destructive" />Out</span><span>Right: kept</span></p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {([['Where it came from', r.sources, 'bg-success'], ['Where it went', r.uses, 'bg-destructive']] as const).map(([title, rows, color]) => (
          <Panel key={title} title={title}>
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded in this period.</p> : (
              <ul className="space-y-2.5">
                {rows.slice(0, 8).map((x) => (
                  <li key={x.category} className="text-sm">
                    <div className="flex justify-between gap-3"><span className="truncate">{x.category}</span><span className="shrink-0 tabular-nums"><strong>{formatINR(x.value)}</strong> <span className="text-xs text-muted-foreground">{x.pct}%</span></span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn('h-full rounded-full', color)} style={{ width: `${x.pct}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </div>
  )
}
