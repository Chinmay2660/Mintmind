'use client'

import { TabBar } from '@/components/ui/tab-bar'
import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, Check, Download, FileSpreadsheet, FileText, Flag, Plus, Scale, StickyNote, TrendingUp } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { growthVs, toISO } from '@/lib/wealth/calc'
import { ASSET_LABELS, LIABILITY_LABELS } from '@/lib/wealth/labels'
import { formatCompactINR, formatDate, formatINR } from '@/lib/wealth/format'
import { monthLabel } from '@/lib/wealth/selectors'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { QuickTiles } from '@/components/ui/quick-tiles'
import { Input } from '@/components/ui/input'
import { Delta, Empty, LoadingBlock, PageHeader, Panel, RangeTabs, Stat, chartAxis, chartColor, chartGrid, chartTooltipStyle } from '@/components/wealth/kit'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { GoalsPanel } from '@/components/wealth/GoalsPanel'
import { ForecastPanel } from '@/components/wealth/ForecastPanel'
import { AllocationLeverage } from '@/components/wealth/AllocationLeverage'
import { FinancialMetrics } from '@/components/wealth/FinancialMetrics'
import { LimitsPanel } from '@/components/wealth/LimitsPanel'
import { WhyChanged } from '@/components/wealth/WhyChanged'
import { NetWorthJournal } from '@/components/wealth/NetWorthJournal'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { assetValue } from '@/lib/wealth/holdings'
import { byAccountType } from '@/lib/wealth/accountTypes'
import { netWorthEvents } from '@/lib/wealth/nwEvents'
import { DateInput } from '@/components/ui/pickers'

const VIEWS = ['Monthly', 'Yearly'] as const
const RANGES = [{ key: 'all', label: 'All time', months: 0 }, { key: '6m', label: '6 months', months: 6 }, { key: '1y', label: '1 year', months: 12 }, { key: '3y', label: '3 years', months: 36 }, { key: 'custom', label: 'Custom', months: -1 }] as const
const monthsAgoISO = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return toISO(d) }

// how each kind of milestone looks: a colour and an icon, so it never depends on colour alone
const EVENT_STYLE: Record<string, { color: string; icon: typeof Flag; label: string }> = {
  start: { color: 'hsl(var(--chart-1))', icon: Flag, label: 'Start' },
  'debt-new': { color: 'hsl(var(--destructive))', icon: Flag, label: 'New debt' },
  'debt-down': { color: 'hsl(var(--success))', icon: Check, label: 'Debt reduced' },
  'asset-new': { color: 'hsl(var(--chart-2))', icon: Plus, label: 'New asset' },
  'asset-up': { color: 'hsl(var(--chart-2))', icon: TrendingUp, label: 'Asset up' },
  note: { color: 'hsl(var(--muted-foreground))', icon: StickyNote, label: 'Your note' },
}
type Kind = 'asset' | 'liability'

function NetWorthOverview() {
  const { ready, data, netWorth } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [view, setView] = useState<(typeof VIEWS)[number]>('Monthly')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customRange, setCustomRange] = useState(false)
  // which lines the History chart draws: Net worth to start with; Assets and Liabilities can be added
  const [show, setShow] = useState<{ netWorth: boolean; assets: boolean; liabilities: boolean }>({ netWorth: true, assets: false, liabilities: false })
  // which quick choice matches the dates now: a preset starts at a date and runs to today, so it leaves "to" empty
  const rangeKey = customRange ? 'custom' : !from && !to ? 'all' : (RANGES.find((r) => r.months > 0 && !to && from === monthsAgoISO(r.months))?.key ?? 'custom')
  const pickRange = (k: string) => {
    const r = RANGES.find((x) => x.key === k)!
    if (r.key === 'custom') { setCustomRange(true); return }
    setCustomRange(false); setTo('')
    setFrom(r.months > 0 ? monthsAgoISO(r.months) : '')
  }
  const today = useMemo(() => new Date(), [])

  const snapshots = useMemo(() => {
    let s = [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date))
    if (from) s = s.filter((x) => x.date >= from)
    if (to) s = s.filter((x) => x.date <= to)
    if (view === 'Yearly') {
      const byYear = new Map<string, any>()
      for (const x of s) byYear.set(x.date.slice(0, 4), x) // last snapshot of each year
      s = [...byYear.values()]
    }
    return s
  }, [data.snapshots, from, to, view])

  const events = useMemo(() => netWorthEvents(data.snapshots), [data.snapshots])
  if (!ready) return <LoadingBlock className="h-96" />

  const chart = snapshots.map((s) => ({ ym: s.date.slice(0, 7), label: view === 'Yearly' ? s.date.slice(0, 4) : monthLabel(s.date.slice(0, 7)), netWorth: s.netWorth, assets: s.assets, liabilities: s.liabilities }))

  // markers sit on months, so they show in the monthly view and only for months inside the range
  const shownEvents = view === 'Monthly' ? events.filter((e) => chart.some((c) => c.ym === e.ym)) : []

  return (
    <div className="space-y-5">
      <PageHeader
        description="Assets minus liabilities, updated automatically. The breakdown by kind is on the Overview."
        actions={
          <QuickTiles label="Net worth shortcuts" items={[
            { key: 'invest', label: 'Investments', icon: TrendingUp, href: '/dashboard/mutual-funds' },
            { key: 'property', label: 'Property', icon: Building2, href: '/dashboard/mutual-funds?tab=property' },
            { key: 'loans', label: 'Loans', icon: Scale, href: '/dashboard/net-worth/loans' },
          ]} />
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 border-b border-border pb-5">
        <Stat label="Net worth" value={<Money value={netWorth.netWorth} />} />
        <Stat label="Total assets" value={<Money value={netWorth.assets} />} />
        <Stat label="Total liabilities" value={<Money value={netWorth.liabilities} />} />
        <Stat label="Debt to assets" value={`${netWorth.assets ? Math.round((netWorth.liabilities / netWorth.assets) * 1000) / 10 : 0}%`} />
      </div>

      <Panel
        title="History"
        action={<RangeTabs value={view} onChange={setView} options={VIEWS as readonly (typeof VIEWS)[number][]} label="Granularity" />}
      >
        {/* how far back: quick choices first; two date fields only when you pick Custom */}
        <div className="mb-3 space-y-2">
          <div role="group" aria-label="How far back" className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => {
              const on = rangeKey === r.key
              return (
                <button key={r.key} type="button" aria-pressed={on} onClick={() => pickRange(r.key)}
                  className={cn('inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{r.label}</button>
              )
            })}
          </div>
          {rangeKey === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0 text-xs text-muted-foreground">From<div className="mt-0.5"><DateInput aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div></label>
              <label className="min-w-0 text-xs text-muted-foreground">To<div className="mt-0.5"><DateInput aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div></label>
            </div>
          )}
        </div>
        {chart.length < 2 ? <Empty title="Not enough snapshots for this range" /> : (() => {
          const SERIES = [{ k: 'netWorth', label: 'Net worth', color: chartColor(1) }, { k: 'assets', label: 'Assets', color: chartColor(2) }, { k: 'liabilities', label: 'Liabilities', color: chartColor(5) }] as const
          const active = SERIES.filter((x) => show[x.k])
          // the scale follows what is drawn, with room above and below, so the movement is visible instead of squashed against zero
          const vals = chart.flatMap((c) => active.map((x) => c[x.k]))
          const lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max(1, (hi - lo) * 0.12)
          const toggle = (k: 'netWorth' | 'assets' | 'liabilities') => setShow((cur) => (cur[k] && SERIES.filter((x) => cur[x.k]).length === 1 ? cur : { ...cur, [k]: !cur[k] }))
          return (
            <>
              <div role="group" aria-label="Lines on the chart" className="mb-2 flex flex-wrap gap-2">
                {SERIES.map((x) => (
                  <button key={x.k} type="button" aria-pressed={show[x.k]} onClick={() => toggle(x.k)} className={cn('inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', show[x.k] ? 'border-border bg-card text-foreground' : 'border-border text-muted-foreground')}>
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: show[x.k] ? x.color : 'transparent', boxShadow: `inset 0 0 0 1.5px ${x.color}` }} aria-hidden />{x.label}
                  </button>
                ))}
              </div>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="nwHistFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor(1)} stopOpacity={0.25} /><stop offset="100%" stopColor={chartColor(1)} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke={chartGrid} vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" {...chartAxis} minTickGap={36} axisLine={false} tickLine={false} />
                    <YAxis {...chartAxis} width={68} axisLine={false} tickLine={false} domain={[lo - pad, hi + pad]} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                    <Tooltip {...chartTooltipStyle} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3', strokeOpacity: 0.6 }} formatter={(v: number, n: string) => [privacyMode ? '••••' : formatINR(v), n]} />
                    {show.liabilities && <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke={chartColor(5)} strokeWidth={2} fill="none" dot={false} activeDot={{ r: 4 }} />}
                    {show.assets && <Area type="monotone" dataKey="assets" name="Assets" stroke={chartColor(2)} strokeWidth={2} fill="none" dot={false} activeDot={{ r: 4 }} />}
                    {show.netWorth && <Area type="monotone" dataKey="netWorth" name="Net worth" stroke={chartColor(1)} strokeWidth={2.5} fill="url(#nwHistFill)" dot={false} activeDot={{ r: 5, stroke: 'hsl(var(--card))', strokeWidth: 2 }} />}
                    {/* Recharts must see these as direct children of the chart, so they are a flat list and not wrapped in a group */}
                    {shownEvents.flatMap((e) => { const pt = chart.find((c) => c.ym === e.ym); if (!pt) return []; const st = EVENT_STYLE[e.kind]; return [<ReferenceLine key={`${e.id}-l`} x={pt.label} stroke={st.color} strokeDasharray="2 4" strokeOpacity={0.6} />, <ReferenceDot key={`${e.id}-d`} x={pt.label} y={pt.netWorth} r={6} fill={st.color} stroke="hsl(var(--card))" strokeWidth={2} />] })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )
        })()}
        {shownEvents.length > 0 && (
          <ol className="mt-4 grid gap-x-6 gap-y-2.5 border-t border-border pt-3 sm:grid-cols-2" aria-label="Milestones on the chart">
            {shownEvents.map((e) => { const st = EVENT_STYLE[e.kind]; const Icon = st.icon; return (
              <li key={e.id} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: st.color }} aria-hidden><Icon className="h-3.5 w-3.5" strokeWidth={2.5} /></span>
                <span className="min-w-0"><span className="block font-medium"><span className="sr-only">{st.label}: </span>{e.text}</span><span className="block text-xs text-muted-foreground">{monthLabel(e.ym)}{e.nwDelta != null ? <> · <span className={e.nwDelta < 0 ? 'text-destructive' : 'text-success'}>{e.nwDelta < 0 ? '-' : '+'}{formatCompactINR(Math.abs(e.nwDelta))} net worth</span></> : ''}</span></span>
              </li>
            ) })}
          </ol>
        )}
      </Panel>

      <WhyChanged />
      <NetWorthJournal />

    </div>
  )
}


export default function NetWorthPage() {
  const [tab, setTab] = useState<'Overview' | 'Goals' | 'Forecast'>('Overview')
  // a link like ?add=goal lands on the Goals tab (set after mount, so the server and browser render the same first paint)
  useEffect(() => { if (new URLSearchParams(window.location.search).get('add') === 'goal') setTab('Goals') }, [])
  return (
    <div className="space-y-5">
      <TabBar label="Net worth views" tabs={[{ key: 'Overview', label: 'Overview' }, { key: 'Goals', label: 'Goals' }, { key: 'Forecast', label: 'Forecast' }]} value={tab} onChange={(k) => setTab(k as typeof tab)} />
      {tab === 'Overview' ? <><NetWorthOverview /><AllocationLeverage /><FinancialMetrics /><LimitsPanel /></> : tab === 'Goals' ? <GoalsPanel /> : <ForecastPanel />}
    </div>
  )
}
