'use client'

import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
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
import { WhyChanged } from '@/components/wealth/WhyChanged'
import { NetWorthJournal } from '@/components/wealth/NetWorthJournal'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { assetValue } from '@/lib/wealth/holdings'

const VIEWS = ['Monthly', 'Yearly'] as const
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

  if (!ready) return <LoadingBlock className="h-96" />

  const cmp = [
    { label: 'Last month', g: growthVs(data.snapshots, netWorth.netWorth, 1, today) },
    { label: '3 months ago', g: growthVs(data.snapshots, netWorth.netWorth, 3, today) },
    { label: 'Last year', g: growthVs(data.snapshots, netWorth.netWorth, 12, today) },
  ]
  const chart = snapshots.map((s) => ({ label: view === 'Yearly' ? s.date.slice(0, 4) : monthLabel(s.date.slice(0, 7)), netWorth: s.netWorth, assets: s.assets, liabilities: s.liabilities }))

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
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1.5 h-4 w-4" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportXlsx}><Download className="mr-1.5 h-4 w-4" />Excel</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            <Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
            <Input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-xs" />
            {(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo('') }}>Clear</Button>}
          </div>
        }
      >
        {chart.length < 2 ? <Empty title="Not enough snapshots for this range" /> : (
          <div className="h-72" role="img" aria-label="Net worth history chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" {...chartAxis} minTickGap={24} />
                <YAxis {...chartAxis} width={56} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number, n: string) => [privacyMode ? '••••' : formatINR(v), n]} />
                <Area type="monotone" dataKey="assets" name="Assets" stroke={chartColor(2)} fill={chartColor(2)} fillOpacity={0.08} strokeWidth={1.5} />
                <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke={chartColor(5)} fill={chartColor(5)} fillOpacity={0.08} strokeWidth={1.5} />
                <Area type="monotone" dataKey="netWorth" name="Net worth" stroke={chartColor(1)} fill={chartColor(1)} fillOpacity={0.15} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
  const [tab, setTab] = useState<'Overview' | 'Goals'>('Overview')
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Net worth views" className="flex gap-1 border-b border-border">
        {(['Overview', 'Goals'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:bg-muted', tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t}</button>)}
      </div>
      {tab === 'Overview' ? <NetWorthOverview /> : <GoalsPanel />}
    </div>
  )
}
