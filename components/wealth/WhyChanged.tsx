'use client'

import { useMemo, useState } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { netWorthAttribution, rangeBase } from '@/lib/wealth/journey'
import { formatDate } from '@/lib/wealth/format'
import { Money } from './Money'
import { Empty, Panel, RangeTabs } from './kit'
import { cn } from '@/lib/utils'

const RANGES = ['Month', '3 months', 'Year', 'All']

/** Why did my net worth change? Splits the change into causes that always add up to the total. */
export function WhyChanged() {
  const { data, netWorth } = useWealth()
  const [range, setRange] = useState('Month')
  const a = useMemo(() => {
    const base = rangeBase(data.snapshots, range)
    return base ? netWorthAttribution({ base, current: netWorth, fundTxns: data.fundTxns }) : null
  }, [data.snapshots, data.fundTxns, netWorth, range])
  const max = a ? Math.max(...a.causes.map((c) => Math.abs(c.amount)), 1) : 1

  return (
    <Panel title="Why did my net worth change?" action={<RangeTabs value={range} onChange={setRange} options={RANGES} label="Period" />}>
      {!a || a.causes.length === 0 ? <Empty title="Nothing to compare yet" description="This fills in as your net worth snapshots build up." /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold"><Money value={a.diff} signed /></p>
            <p className="text-xs text-muted-foreground"><Money value={a.from} compact /> on {formatDate(a.baseDate)} → <Money value={a.to} compact /> today</p>
          </div>
          <ul className="space-y-3">
            {a.causes.map((c) => (
              <li key={c.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{c.label}</span><Money value={c.amount} signed className="shrink-0 font-medium" /></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden><div className={cn('h-full rounded-full', c.amount >= 0 ? 'bg-primary' : 'bg-destructive')} style={{ width: `${Math.max((Math.abs(c.amount) / max) * 100, 2)}%` }} /></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
              </li>
            ))}
          </ul>
          {Math.abs(a.unexplained) >= 1 && <p className="text-xs text-muted-foreground">Other changes: <Money value={a.unexplained} signed /></p>}
        </div>
      )}
    </Panel>
  )
}
