'use client'

import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EVENT_TYPES, applyPlanToCheckup, earliestRetirementAge, healthScore, moneyCheckup, projectPlan } from '@/lib/planning'
import { formatCompactINR } from '@/lib/wealth/format'
import { chartAxis, chartColor, chartGrid, chartTooltipStyle, FootNote } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'

type Ev = { id: number; type: keyof typeof EVENT_TYPES; amount: number; at: number }
const HORIZONS = [2, 5, 10, 20, 25] as const

/**
 * What-if planner. Each change has an amount and a time (now, or in N years). The chart shows today's path dashed and the
 * path with the changes solid, with a marker where each change happens. Everything is an assumption, never a prediction.
 */
export function PlanAhead({ netWorth, monthlySave, age = 0, monthlyExpense = 0, plannedRetireAge = 0, checkInputs }: { netWorth: number; monthlySave: number; age?: number; monthlyExpense?: number; plannedRetireAge?: number; checkInputs?: Parameters<typeof moneyCheckup>[0] }) {
  const [events, setEvents] = useState<Ev[]>([])
  const [years, setYears] = useState<(typeof HORIZONS)[number]>(10)
  const base = useMemo(() => projectPlan({ netWorth, monthlySave }), [netWorth, monthlySave])
  const plan = useMemo(() => projectPlan({ netWorth, monthlySave, events }), [netWorth, monthlySave, events])
  const rows = useMemo(() => Array.from({ length: years + 1 }, (_, i) => ({ i, year: i === 0 ? 'Now' : `Yr ${i}`, base: Math.round(base.points[i]), plan: Math.round(plan.points[i]) })), [base, plan, years])
  const dEnd = plan.points[years] - base.points[years], dRoom = plan.monthlyRoom - base.monthlyRoom
  const retireBase = earliestRetirementAge({ points: base.points, age, monthlyExpense })
  const retirePlan = earliestRetirementAge({ points: plan.points, age, monthlyExpense })
  const retireShift = retireBase != null && retirePlan != null ? retirePlan - retireBase : null

  // the money check-up score today, and with every change in place
  const scores = useMemo(() => {
    if (!checkInputs) return null
    const now = healthScore(moneyCheckup(checkInputs))
    const next = healthScore(moneyCheckup(applyPlanToCheckup(checkInputs, events)))
    return { now, next, chips: next.groups.map((g, i) => ({ name: g.name, d: g.score != null && now.groups[i].score != null ? g.score - (now.groups[i].score as number) : 0 })).filter((x) => x.d !== 0) }
  }, [checkInputs, events])

  const stat = (label: string, value: string, delta: number, hint?: string) => (
    <div className="rounded-lg bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
      <dd className={cn('mt-0.5 flex items-center gap-1 text-xs tabular-nums', Math.abs(delta) < 1 ? 'text-muted-foreground' : delta > 0 ? 'text-success' : 'text-destructive')}>{delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : delta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}{hint ?? (Math.abs(delta) < 1 ? 'No change' : formatCompactINR(Math.abs(delta)))}</dd></div>
  )
  const shown = events.filter((e) => e.at <= years)

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="surface-card p-4 sm:p-5">
        <h3 className="font-semibold">Plan a change</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{(Object.keys(EVENT_TYPES) as (keyof typeof EVENT_TYPES)[]).map((t) => (
          <button key={t} type="button" onClick={() => setEvents((e) => [...e, { id: Date.now() + Math.random(), type: t, amount: EVENT_TYPES[t].def, at: 0 }])} className="rounded-lg border border-border px-2 py-2.5 text-xs font-medium transition-colors hover:bg-muted">{EVENT_TYPES[t].label}</button>))}</div>
        {events.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Pick what is coming up. The chart redraws before and after. Add as many as you like.</p>}
        <ul className="mt-4 space-y-3">{events.map((e) => { const c = EVENT_TYPES[e.type]; return (
          <li key={e.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between text-sm"><span className="font-medium">{c.title}</span><button type="button" aria-label={`Remove ${c.title}`} onClick={() => setEvents((x) => x.filter((y) => y.id !== e.id))} className="rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4" /></button></div>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCompactINR(e.amount)} <span className="text-xs font-normal text-muted-foreground">{c.unit}</span></p>
            <Slider aria-label={`${c.title} ${c.unit}`} min={c.min} max={c.max} step={c.step} value={e.amount} onChange={(v) => setEvents((x) => x.map((y) => (y.id === e.id ? { ...y, amount: v } : y)))} className="mt-2" />
            <p className="mt-3 text-sm">When: <strong>{e.at === 0 ? 'now' : `in ${e.at} year${e.at === 1 ? '' : 's'}`}</strong>{age > 0 && e.at > 0 ? <span className="text-muted-foreground"> · at age {age + e.at}</span> : null}</p>
            <Slider aria-label={`${c.title}: years from now`} min={0} max={20} step={1} value={e.at} onChange={(v) => setEvents((x) => x.map((y) => (y.id === e.id ? { ...y, at: v } : y)))} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">{c.note}</p></li>) })}</ul>
      </div>
      <div className="surface-card p-4 sm:p-5">
        {scores && scores.now.score != null && (
          <div className="mb-4 border-b border-border pb-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" role="group" aria-label="Money check-up score">
              <span className="text-xs text-muted-foreground">Your score</span>
              {events.length > 0 && scores.next.score !== scores.now.score && <span className="text-2xl font-semibold tabular-nums text-muted-foreground line-through" aria-label={`was ${scores.now.score}`}>{scores.now.score}</span>}
              <span className="text-4xl font-bold tabular-nums">{events.length > 0 ? scores.next.score : scores.now.score}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-bold">{events.length > 0 ? scores.next.label : scores.now.label}</span>
            </div>
            {events.length > 0 && (scores.chips.length > 0
              ? <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="What changes">{scores.chips.map((c) => <li key={c.name} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">{c.name} <span className={c.d > 0 ? 'font-bold text-success' : 'font-bold text-destructive'}>{c.d > 0 ? '+' : '-'}{Math.abs(c.d)}</span></li>)}</ul>
              : <p className="mt-2 text-xs text-muted-foreground">These changes do not move your check-up score.</p>)}
          </div>
        )}
        <dl className="grid gap-3 sm:grid-cols-3">
          {stat(`Net worth in ${years} years`, formatCompactINR(plan.points[years]), dEnd)}
          {age > 0 && monthlyExpense > 0
            ? stat(`Could retire at${plannedRetireAge ? ` (planned ${plannedRetireAge})` : ''}`, retirePlan != null ? String(retirePlan) : 'Beyond 25 years', retireShift == null ? 0 : -retireShift, retireShift == null ? 'Needs more years' : retireShift === 0 ? 'No change' : `${Math.abs(retireShift)} yr${Math.abs(retireShift) === 1 ? '' : 's'} ${retireShift > 0 ? 'later' : 'sooner'}`)
            : stat('Net worth today', formatCompactINR(plan.points[0]), plan.points[0] - netWorth)}
          {stat('Left to save each month', formatCompactINR(plan.monthlyRoom), dRoom)}
        </dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-foreground/60" />Today&apos;s path</span><span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-[3px]" style={{ borderColor: chartColor(1) }} />With the changes</span></div>
          <div role="group" aria-label="Years shown" className="flex gap-1">{HORIZONS.map((h) => <button key={h} type="button" onClick={() => setYears(h)} aria-pressed={years === h} className={cn('rounded-full border px-2.5 py-1 text-xs', years === h ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{h === 25 ? 'All' : `${h}y`}</button>)}</div>
        </div>
        <div className="mt-2 h-72" role="img" aria-label="Projected net worth, today's path versus with your changes">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" {...chartAxis} interval="preserveStartEnd" /><YAxis {...chartAxis} width={64} tickFormatter={(v) => formatCompactINR(v)} />
            <Tooltip {...chartTooltipStyle} formatter={(v: number) => formatCompactINR(v)} />
            <Line dataKey="base" name="Today's path" stroke="hsl(var(--foreground) / 0.6)" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="plan" name="With the changes" stroke={chartColor(1)} strokeWidth={3} dot={false} />
            {shown.flatMap((e) => { const r = rows[e.at]; return r ? [<ReferenceLine key={`${e.id}-l`} x={r.year} stroke={chartColor(2)} strokeDasharray="2 4" strokeOpacity={0.7} />, <ReferenceDot key={`${e.id}-d`} x={r.year} y={r.plan} r={6} fill={chartColor(2)} stroke="hsl(var(--card))" strokeWidth={2} />] : [] })}
          </LineChart></ResponsiveContainer>
        </div>
        {shown.length > 0 && (
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 border-t border-border pt-3 text-sm sm:grid-cols-2" aria-label="Changes on the chart">
            {[...shown].sort((a, b) => a.at - b.at).map((e) => (
              <li key={e.id} className="flex items-baseline gap-2"><span className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-full" style={{ background: chartColor(2) }} aria-hidden /><span className="min-w-0 truncate">{EVENT_TYPES[e.type].title} <span className="text-muted-foreground">· {e.at === 0 ? 'now' : `year ${e.at}`}</span></span></li>
            ))}
          </ol>
        )}
        <FootNote className="mt-3" label="Assumptions">Projected, not guaranteed. Assumes 9% yearly growth and monthly saving that rises 5% a year. Retirement needs 25 times a year of today&apos;s spending, grown by 6% a year for inflation, and is a rule of thumb.</FootNote>
      </div>
    </div>
  )
}
