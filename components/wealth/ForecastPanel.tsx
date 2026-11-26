'use client'

import { GrowwChart } from '@/components/wealth/GrowwChart'
import { istNow } from '@/lib/wealth/calc'
import { useMemo, useState } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { cashForecast, goalForecast, monthlyAverages } from '@/lib/wealth/forecast'
import { goalProgress } from '@/lib/wealth/goals'
import { projectPlan } from '@/lib/planning'
import { formatCompactINR, formatINR } from '@/lib/wealth/format'
import { Money } from './Money'
import { Empty, InfoTip, Metric, Panel, Stat } from './kit'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

const label = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
const YEARS = [1, 5, 10, 20] as const

/** Three looks ahead, all from your own recent figures and clearly labelled as estimates: net worth, cash, and your goals. */
export function ForecastPanel() {
  const { data, netWorth } = useWealth()
  const today = useMemo(() => istNow(), [])
  const avg = useMemo(() => monthlyAverages({ expenses: data.expenses as any[], bankTxns: data.bankTxns as any[], today }), [data.expenses, data.bankTxns, today])
  const saving = Math.max(0, avg.income - avg.spend)
  const [growth, setGrowth] = useState(9)
  const [years, setYears] = useState<(typeof YEARS)[number]>(10)

  const nw = useMemo(() => projectPlan({ netWorth: netWorth.netWorth, monthlySave: saving, growthPct: growth, years: 20 }), [netWorth.netWorth, saving, growth])
  const nwRows = useMemo(() => Array.from({ length: years + 1 }, (_, i) => ({ label: i === 0 ? 'Now' : `Yr ${i}`, value: Math.round(nw.points[i]) })), [nw, years])
  const cash = useMemo(() => cashForecast({ cash: netWorth.assetBreakdown.bank || 0, income: avg.income, spend: avg.spend, months: 6, today }), [netWorth.assetBreakdown.bank, avg, today])
  const goals = useMemo(() => goalForecast((data.goals as any[]).map((g) => { const p = goalProgress(g, data, today); return { id: g.id, name: g.name, remaining: p.remaining, monthsLeft: p.monthsLeft } }), saving), [data, saving, today])

  if (avg.months === 0) return <Empty title="Not enough history yet" description="Forecasts use your recent income and spending. Record a month or two of both and they appear here." />

  return (
    <div className="space-y-5">
      <section aria-label="What the forecasts assume" className="grid grid-cols-1 gap-3 border-b border-border pb-5 min-[460px]:grid-cols-2 lg:grid-cols-4">
        <Stat label="Average income" info={`Over your last ${avg.months} whole months with a record.`} value={<Money value={avg.income} />} hint="a month" />
        <Stat label="Average spending" value={<Money value={avg.spend} />} hint="a month" />
        <Stat label="Saved each month" info="Average income minus average spending. This is what the forecasts add to your money every month." value={<Money value={saving} />} />
        <Stat label="Net worth today" value={<Money value={netWorth.netWorth} />} />
      </section>

      <Panel title="Net worth ahead" description="Your net worth grown at the yearly return you choose, with the monthly saving above rising 5% a year. An estimate, not a promise."
        action={<div className="flex gap-1">{YEARS.map((y) => <button key={y} type="button" onClick={() => setYears(y)} aria-pressed={years === y} className={cn('rounded-full border px-2.5 py-1 text-xs', years === y ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{y}y</button>)}</div>}>
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">In {years} years</p><p className="text-xl font-semibold tabular-nums"><Money value={Math.round(nw.points[years])} /></p></div>
          <div><p className="text-xs text-muted-foreground">Change from today</p><Metric amount={Math.round(nw.points[years] - netWorth.netWorth)} className="text-base font-semibold" /></div>
          <label className="text-xs text-muted-foreground">Yearly return: <strong className="text-foreground">{growth}%</strong><InfoTip label="Yearly return">The average yearly growth of what you own. Equity has swung widely from year to year, so try a lower figure too.</InfoTip><Slider aria-label="Yearly return in percent" min={3} max={14} step={1} value={growth} onChange={setGrowth} className="mt-1" /></label>
        </div>
        <GrowwChart height={200} tone="neutral" ariaLabel="Net worth ahead" format={(v) => formatCompactINR(v)} data={nwRows.map((r: any) => ({ x: String(r.label), y: Number(r.value) }))} />
      </Panel>

      <Panel title="Cash over the next 6 months" description="Your bank and cash balance if each month looks like your recent average. It does not know about one-off bills, bonuses or a change in your spending.">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span>{cash.net >= 0 ? 'Growing by' : 'Falling by'} <strong className={cn('tabular-nums', cash.net < 0 && 'text-destructive')}>{formatINR(Math.abs(cash.net))}</strong> a month</span>
          {cash.runsOut ? <span className="font-semibold text-destructive" role="status">Runs out in {label(cash.runsOut.ym)} at this pace</span> : <span className="text-muted-foreground">Lowest: {formatINR(cash.lowest.end)} in {label(cash.lowest.ym)}</span>}
        </div>
        <GrowwChart height={180} zero ariaLabel="Cash over the coming months" format={(v) => formatCompactINR(v)} data={cash.points.map((p) => ({ x: label(p.ym), y: p.end }))} />
      </Panel>

      <Panel title="Goals" description="If your monthly saving were shared equally between the goals still open, when would each be reached? Change the shares on the goals themselves; this is only a picture.">
        {goals.length === 0 ? <Empty title="No open goals" description="Add a goal under Net worth, Goals to see when you could reach it." /> : (
          <ul className="divide-y divide-border">
            {goals.map((g) => (
              <li key={g.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{g.name}</span><span className="tabular-nums text-muted-foreground">{formatINR(g.remaining)} to go</span></div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {g.monthsToReach == null ? 'No saving at the moment, so there is no date.' : `About ${g.monthsToReach} month${g.monthsToReach === 1 ? '' : 's'} at ${formatINR(g.share)} a month.`}
                  {g.neededMonthly != null ? ` To make its date you would need ${formatINR(g.neededMonthly)} a month.` : ''}
                </p>
                {g.onTrack != null && <span className={cn('mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold', g.onTrack ? 'border-primary/50 bg-primary/15' : 'border-warning/60 bg-warning/15')}>{g.onTrack ? 'On track for its date' : 'Behind for its date'}</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
