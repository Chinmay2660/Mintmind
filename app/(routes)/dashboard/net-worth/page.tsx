'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, Download, FileText, Flag, Plus, StickyNote, TrendingUp } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { growthVs, toISO } from '@/lib/wealth/calc'
import { ASSET_LABELS, LIABILITY_LABELS } from '@/lib/wealth/labels'
import { formatCompactINR, formatDate, formatINR } from '@/lib/wealth/format'
import { monthLabel } from '@/lib/wealth/selectors'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
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
import { TabBar } from '@/components/ui/tab-bar'

const VIEWS = ['Monthly', 'Yearly'] as const

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
  const byType = useMemo(() => byAccountType(netWorth.assetBreakdown), [netWorth.assetBreakdown])
  if (!ready) return <LoadingBlock className="h-96" />

  const cmp = [
    { label: 'Last month', g: growthVs(data.snapshots, netWorth.netWorth, 1, today) },
    { label: '3 months ago', g: growthVs(data.snapshots, netWorth.netWorth, 3, today) },
    { label: 'Last year', g: growthVs(data.snapshots, netWorth.netWorth, 12, today) },
  ]
  const chart = snapshots.map((s) => ({ ym: s.date.slice(0, 7), label: view === 'Yearly' ? s.date.slice(0, 4) : monthLabel(s.date.slice(0, 7)), netWorth: s.netWorth, assets: s.assets, liabilities: s.liabilities }))

  // markers sit on months, so they show in the monthly view and only for months inside the range
  const shownEvents = view === 'Monthly' ? events.filter((e) => chart.some((c) => c.ym === e.ym)) : []

  const exportXlsx = async () => {
    const XLSX = await import('xlsx') // ~400 KB, loaded only on demand
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshots.map((s) => ({ Date: s.date, Assets: s.assets, Liabilities: s.liabilities, 'Net worth': s.netWorth }))), 'Snapshots')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(netWorth.assetBreakdown).map(([k, v]) => ({ Category: ASSET_LABELS[k as keyof typeof ASSET_LABELS] ?? k, Value: v }))), 'Assets')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(netWorth.liabilityBreakdown).map(([k, v]) => ({ Category: LIABILITY_LABELS[k as keyof typeof LIABILITY_LABELS] ?? k, Outstanding: v }))), 'Liabilities')
    XLSX.writeFile(wb, `net-worth-${toISO(today)}.xlsx`)
  }
  const exportCsv = () => {
    const rows = ['Date,Assets,Liabilities,Net worth', ...snapshots.map((s) => `${s.date},${s.assets},${s.liabilities},${s.netWorth}`)]
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `net-worth-${toISO(today)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        description="Assets minus liabilities, updated automatically. Add or edit EPF, FDs, gold, property, stocks and loans in Settings → Assets & Loans."
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link href="/dashboard/net-worth/manage">Manage assets &amp; loans</Link></Button>
            <Button variant="outline" size="sm" asChild><Link href="/dashboard/net-worth/statement"><FileText className="mr-1.5 h-4 w-4" />Statement</Link></Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1.5 h-4 w-4" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportXlsx}><Download className="mr-1.5 h-4 w-4" />Excel</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 border-b border-border pb-5">
        <Stat label="Net worth" value={<Money value={netWorth.netWorth} />} />
        <Stat label="Total assets" value={<Money value={netWorth.assets} />} />
        <Stat label="Total liabilities" value={<Money value={netWorth.liabilities} />} />
        <Stat label="Debt to assets" value={`${netWorth.assets ? Math.round((netWorth.liabilities / netWorth.assets) * 1000) / 10 : 0}%`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cmp.map((c) => (
          <div key={c.label} className="surface-card px-4 py-3">
            <p className="text-xs text-muted-foreground">vs {c.label}</p>
            {c.g ? (<><p className="mt-1 text-sm font-semibold"><Money value={c.g.base} /> <span className="font-normal text-muted-foreground">on {formatDate(c.g.baseDate)}</span></p><Delta amount={c.g.diff} pct={c.g.pct} /></>) : <p className="mt-1 text-sm text-muted-foreground">Not enough history</p>}
          </div>
        ))}
      </div>

      <Panel
        title="History"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RangeTabs value={view} onChange={setView} options={VIEWS as readonly (typeof VIEWS)[number][]} label="Granularity" />
            <DateInput aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
            <DateInput aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-xs" />
            {(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo('') }}>Clear</Button>}
          </div>
        }
      >
        {chart.length < 2 ? <Empty title="Not enough snapshots for this range" /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" {...chartAxis} minTickGap={24} />
                <YAxis {...chartAxis} width={56} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number, n: string) => [privacyMode ? '••••' : formatINR(v), n]} />
                <Area type="monotone" dataKey="assets" name="Assets" stroke={chartColor(2)} fill={chartColor(2)} fillOpacity={0.08} strokeWidth={1.5} />
                <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke={chartColor(5)} fill={chartColor(5)} fillOpacity={0.08} strokeWidth={1.5} />
                <Area type="monotone" dataKey="netWorth" name="Net worth" stroke={chartColor(1)} fill={chartColor(1)} fillOpacity={0.15} strokeWidth={2.5} />
                {/* Recharts must see these as direct children of the chart, so they are a flat list and not wrapped in a group */}
                {shownEvents.flatMap((e) => { const pt = chart.find((c) => c.ym === e.ym); if (!pt) return []; const st = EVENT_STYLE[e.kind]; return [<ReferenceLine key={`${e.id}-l`} x={pt.label} stroke={st.color} strokeDasharray="2 4" strokeOpacity={0.6} />, <ReferenceDot key={`${e.id}-d`} x={pt.label} y={pt.netWorth} r={6} fill={st.color} stroke="hsl(var(--card))" strokeWidth={2} />] })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
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

      <Panel title="By account type" description="Your assets grouped by the kind of account they sit in. Liabilities are not netted off here.">
        {byType.length === 0 ? <Empty title="No assets yet" /> : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full border border-border">
              {byType.map((r, i) => <span key={r.key} style={{ width: `${r.pct}%`, background: chartColor((((i % 6) + 1)) as 1 | 2 | 3 | 4 | 5 | 6) }} />)}
            </div>
            <ul className="mt-3 divide-y divide-border">
              {byType.map((r, i) => (
                <li key={r.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: chartColor((((i % 6) + 1)) as 1 | 2 | 3 | 4 | 5 | 6) }} aria-hidden />{r.label}<span className="text-xs text-muted-foreground">{r.pct}%</span></span>
                  <Money value={r.value} className="font-medium" />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <WhyChanged />
      <NetWorthJournal />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Assets">
          <ul className="divide-y divide-border">
            <Row name="Bank savings" sub="From Bank Accounts" value={netWorth.assetBreakdown.bank || 0} />
            <Row name="Mutual funds" sub="From Mutual Funds" value={netWorth.assetBreakdown.mutualFunds || 0} />
            {data.assets.map((a) => (
              <Row key={a.id} name={a.name} sub={`${ASSET_LABELS[a.category as keyof typeof ASSET_LABELS] ?? a.category} · Updated ${formatDate(a.updated)}`} value={assetValue(a)} />
            ))}
          </ul>
        </Panel>
        <Panel title="Liabilities">
          <ul className="divide-y divide-border">
            <Row name="Credit card dues" sub="From Cards" value={netWorth.liabilityBreakdown.creditCards || 0} />
            {data.liabilities.map((l) => (
              <Row key={l.id} name={l.name} sub={`${LIABILITY_LABELS[l.category as keyof typeof LIABILITY_LABELS] ?? l.category}${l.emi ? ` · EMI ${formatINR(l.emi)}` : ''}`} value={l.outstanding} />
            ))}
          </ul>
        </Panel>
      </div>

    </div>
  )
}

function Row({ name, sub, value }: { name: string; sub: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0"><p className="truncate text-sm font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{sub}</p></div>
      <div className="flex shrink-0 items-center gap-1">
        <Money value={value} className="text-sm font-medium" />
      </div>
    </li>
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
