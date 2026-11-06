'use client'

import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EVENT_TYPES, projectPlan } from '@/lib/planning'
import { formatCompactINR } from '@/lib/wealth/format'
import { chartAxis, chartColor, chartGrid, chartTooltipStyle } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { num } from '@/components/tools/kit'

type Ev = { id: number; type: keyof typeof EVENT_TYPES; amount: number }
const HORIZONS = [5, 10, 20, 25] as const

export function PlanAhead({ netWorth, monthlySave }: { netWorth: number; monthlySave: number }) {
  const [events, setEvents] = useState<Ev[]>([])
  const [years, setYears] = useState<(typeof HORIZONS)[number]>(10)
  const base = useMemo(() => projectPlan({ netWorth, monthlySave }), [netWorth, monthlySave])
  const plan = useMemo(() => projectPlan({ netWorth, monthlySave, events }), [netWorth, monthlySave, events])
  const rows = useMemo(() => Array.from({ length: years + 1 }, (_, i) => ({ year: i === 0 ? 'Now' : `Yr ${i}`, base: Math.round(base.points[i]), plan: Math.round(plan.points[i]) })), [base, plan, years])
  const dEnd = plan.points[years] - base.points[years], dRoom = plan.monthlyRoom - base.monthlyRoom
  const stat = (label: string, value: string, delta: number) => (
    <div className="rounded-lg bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
      <dd className={cn('mt-0.5 flex items-center gap-1 text-xs tabular-nums', Math.abs(delta) < 1 ? 'text-muted-foreground' : delta > 0 ? 'text-success' : 'text-destructive')}>{delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : delta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}{Math.abs(delta) < 1 ? 'No change' : formatCompactINR(Math.abs(delta))}</dd></div>
  )
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="surface-card p-4 sm:p-5">
        <h3 className="font-semibold">Add a change</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">{(Object.keys(EVENT_TYPES) as (keyof typeof EVENT_TYPES)[]).map((t) => (
          <button key={t} onClick={() => setEvents((e) => [...e, { id: Date.now() + Math.random(), type: t, amount: EVENT_TYPES[t].def }])} className="rounded-lg border border-border px-2 py-2.5 text-xs font-medium transition-colors hover:bg-muted">{EVENT_TYPES[t].label}</button>))}</div>
        {events.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Pick what is coming up. The chart redraws before and after. Add as many as you like.</p>}
        <ul className="mt-4 space-y-3">{events.map((e) => { const c = EVENT_TYPES[e.type]; return (
          <li key={e.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between text-sm"><span className="font-medium">{c.title}</span><button aria-label={`Remove ${c.title}`} onClick={() => setEvents((x) => x.filter((y) => y.id !== e.id))} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCompactINR(e.amount)} <span className="text-xs font-normal text-muted-foreground">{c.unit}</span></p>
            <input type="range" aria-label={`${c.title} ${c.unit}`} min={c.min} max={c.max} step={c.step} value={e.amount} onChange={(ev) => setEvents((x) => x.map((y) => (y.id === e.id ? { ...y, amount: num(ev.target.value) } : y)))} className="mt-2 w-full accent-[hsl(var(--primary))]" />
            <p className="text-xs text-muted-foreground">{c.note}</p></li>) })}</ul>
      </div>
      <div className="surface-card p-4 sm:p-5">
        <dl className="grid gap-3 sm:grid-cols-3">
          {stat('Net worth today', formatCompactINR(plan.points[0]), plan.points[0] - netWorth)}
          {stat(`Net worth in ${years} years`, formatCompactINR(plan.points[years]), dEnd)}
          {stat('Left to save each month', formatCompactINR(plan.monthlyRoom), dRoom)}
        </dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-foreground/60" />Base case</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" />With the changes</span></div>
          <div className="flex gap-1">{HORIZONS.map((h) => <button key={h} onClick={() => setYears(h)} aria-pressed={years === h} className={cn('rounded-full border px-2.5 py-1 text-xs', years === h ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-muted')}>{h}y</button>)}</div>
        </div>
        <div className="mt-2 h-64" role="img" aria-label="Projected net worth, base case versus with your changes">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" {...chartAxis} interval="preserveStartEnd" /><YAxis {...chartAxis} width={64} tickFormatter={(v) => formatCompactINR(v)} />
            <Tooltip {...chartTooltipStyle} formatter={(v: number) => formatCompactINR(v)} />
            <Line dataKey="base" name="Base case" stroke="hsl(var(--foreground) / 0.6)" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="plan" name="With the changes" stroke={chartColor(1)} strokeWidth={3} dot={false} />
          </LineChart></ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Projected, not guaranteed. Assumes 9% yearly growth and monthly saving that rises 5% a year.</p>
      </div>
    </div>
  )
}
