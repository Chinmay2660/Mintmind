'use client'

import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { portfolioOverview } from '@/lib/wealth/portfolio'
import { portfolioRealised } from '@/lib/wealth/realised'
import { Money } from '../Money'
import { Empty, Metric, PageHeader, Panel, chartColor } from '../kit'

type Slot = 1 | 2 | 3 | 4 | 5 | 6
const slot = (i: number) => (((i % 6) + 1) as Slot)

/** The whole portfolio in one place: every class of investment, its share and what it has gained. Each row opens that section. */
/** part: 'summary' is the figures strip alone (shown above the section tabs, as on Insurance); 'body' is the breakdown below. */
export function PortfolioTab({ onOpen, part = 'body' }: { onOpen: (key: string) => void; part?: 'summary' | 'body' }) {
  const { data } = useWealth()
  const today = useMemo(() => new Date(), [])
  const p = useMemo(() => portfolioOverview({ funds: data.funds as any[], fundTxns: data.fundTxns as any[], sips: data.sips as any[], assets: data.assets as any[], today }), [data.funds, data.fundTxns, data.sips, data.assets, today])
  const rows = p.rows.filter((r) => r.count > 0)
  const realised = useMemo(() => portfolioRealised(data.funds as any[], data.fundTxns as any[]), [data.funds, data.fundTxns])

  if (part === 'summary') return (
    <section aria-label="Summary" className="surface-card px-4">
      <dl className="divide-y divide-border text-sm">
        <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Portfolio value</dt><dd className="font-semibold tabular-nums"><Money value={p.total} /></dd></div>
        <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Invested value</dt><dd className="font-semibold tabular-nums"><Money value={p.invested} /></dd></div>
        <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Gain</dt><dd>{p.invested > 0 ? <span className="flex items-center gap-1.5 font-semibold tabular-nums"><Metric amount={p.gain} compact={false} className="text-sm font-semibold" /><span>(<Metric pct={p.gainPct} className="text-sm font-semibold" />)</span></span> : '-'}</dd></div>
        {realised.hasSales && <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Realised gain</dt><dd className="font-semibold tabular-nums"><Metric amount={realised.realised} compact={false} className="text-sm font-semibold" /></dd></div>}
      </dl>
    </section>
  )

  return (
    <div className="space-y-5">
      <PageHeader description="Everything you have invested, across mutual funds, deposits, retirement accounts, stocks and gold. Property and bank balances are not counted here." />
      {rows.length === 0 ? <Empty title="No investments yet" description="Add a mutual fund, a fixed deposit or any other investment from its section." /> : (
        <Panel title="Where it is">
          <div className="flex h-3 overflow-hidden rounded-full border border-border">
            {rows.map((r, i) => <span key={r.key} style={{ width: `${r.share}%`, background: chartColor(slot(i)) }} />)}
          </div>
          <ul className="mt-3 divide-y divide-border">
            {rows.map((r, i) => (
              <li key={r.key}>
                <button type="button" onClick={() => onOpen(r.key)} className="flex w-full items-center gap-3 py-3 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${r.label}, open`}>
                  <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColor(slot(i)) }} aria-hidden />
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{r.label}</span><span className="block text-xs text-muted-foreground">{r.count} {r.count === 1 ? 'holding' : 'holdings'} · {r.share}% of portfolio</span></span>
                  <span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums"><Money value={r.value} /></span>{r.gain != null && <Metric amount={r.gain} pct={r.gainPct} className="text-xs" />}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
