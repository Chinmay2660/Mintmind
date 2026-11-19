'use client'

import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { portfolioOverview } from '@/lib/wealth/portfolio'
import { Money } from '../Money'
import { Empty, Metric, PageHeader, Panel, Stat, chartColor } from '../kit'

type Slot = 1 | 2 | 3 | 4 | 5 | 6
const slot = (i: number) => (((i % 6) + 1) as Slot)

/** The whole portfolio in one place: every class of investment, its share and what it has gained. Each row opens that section. */
export function PortfolioTab({ onOpen }: { onOpen: (key: string) => void }) {
  const { data } = useWealth()
  const today = useMemo(() => new Date(), [])
  const p = useMemo(() => portfolioOverview({ funds: data.funds as any[], fundTxns: data.fundTxns as any[], sips: data.sips as any[], assets: data.assets as any[], today }), [data.funds, data.fundTxns, data.sips, data.assets, today])
  const rows = p.rows.filter((r) => r.count > 0)

  return (
    <div className="space-y-5">
      <PageHeader description="Everything you have invested, across mutual funds, deposits, retirement accounts, stocks and gold. Property and bank balances are not counted here." />
      <section aria-label="Summary" className="grid grid-cols-1 gap-3 border-b border-border pb-5 min-[460px]:grid-cols-2 lg:grid-cols-4">
        <Stat label="Portfolio value" value={<Money value={p.total} />} />
        <Stat label="Put in" info="Only holdings where you recorded what was paid are counted here." value={<Money value={p.invested} />} />
        <Stat label="Gain" info="Value minus what was put in, for holdings where the cost is known." value={p.invested > 0 ? <Metric amount={p.gain} pct={p.gainPct} className="text-lg font-semibold sm:text-xl" /> : '-'} />
        <Stat label="Holdings" value={rows.reduce((s, r) => s + r.count, 0)} hint={`${rows.length} ${rows.length === 1 ? 'kind' : 'kinds'}`} />
      </section>
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
