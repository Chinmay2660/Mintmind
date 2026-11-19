'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ASSET_LABELS } from '@/lib/wealth/labels'
import { assetGain, assetInvested, assetValue, epfShares, etfDetails, fdDetails, rdDetails } from '@/lib/wealth/holdings'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from './Money'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Empty, Metric, Panel } from './kit'

interface Props {
  assets: any[]
  onAdd: (category: string) => void
  onEdit: (a: any) => void
  onDelete: (a: any) => void
  extra?: ReactNode
  /** Tells the page which kind is on show, so it can hide what does not belong (loans). */
  onFilter?: (kind: string) => void
}

// Order and wording of the sections. A section shows once it has something in it.
const SECTIONS: { cat: string; title: string; add: string }[] = [
  { cat: 'fd', title: 'Fixed deposits', add: 'FD' },
  { cat: 'rd', title: 'Recurring deposits', add: 'RD' },
  { cat: 'epf', title: 'EPF', add: 'EPF' },
  { cat: 'gold', title: 'Physical gold', add: 'Gold' },
  { cat: 'etf', title: 'ETFs', add: 'ETF' },
  { cat: 'stocks', title: 'Stocks', add: 'Stocks' },
  { cat: 'ppf', title: 'PPF', add: 'PPF' },
  { cat: 'nps', title: 'NPS', add: 'NPS' },
  { cat: 'realEstate', title: 'Real estate', add: 'Property' },
  { cat: 'vehicle', title: 'Vehicles', add: 'Vehicle' },
  { cat: 'other', title: 'Other assets', add: 'Other' },
]

const Fig = ({ label, children }: { label: string; children: ReactNode }) => <div className="min-w-0"><dt className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</dt><dd className="mt-0.5 break-words text-sm font-medium tabular-nums">{children}</dd></div>
const rupee = (n: number) => <Money value={n} />

function details(a: any): { figs: ReactNode; value: number } {
  const value = assetValue(a)
  if (a.category === 'fd') {
    const d = fdDetails(a)
    return { value, figs: <>
      <Fig label="Deposited">{rupee(d.principal)}</Fig><Fig label="Rate">{a.ratePct ? `${a.ratePct}%` : '-'}</Fig>
      <Fig label="Matures">{a.maturityDate ? <>{formatDate(a.maturityDate)}{d.daysLeft != null && <span className="text-muted-foreground"> · {d.matured ? 'matured' : `${d.daysLeft}d`}</span>}</> : '-'}</Fig>
      <Fig label="Interest so far">{rupee(d.interest)}</Fig>
      {d.maturityValue != null && <Fig label="At maturity">{rupee(d.maturityValue)}</Fig>}
    </> }
  }
  if (a.category === 'rd') {
    const d = rdDetails(a)
    return { value, figs: <>
      <Fig label="Instalment">{rupee(Number(a.monthlyInstalment) || 0)}</Fig><Fig label="Rate">{a.ratePct ? `${a.ratePct}%` : '-'}</Fig>
      <Fig label="Paid">{d.paid}{d.tenure ? ` of ${d.tenure}` : ''} months</Fig><Fig label="Invested">{rupee(d.invested)}</Fig>
      {d.maturityValue != null && <Fig label="At maturity">{rupee(d.maturityValue)}</Fig>}
    </> }
  }
  if (a.category === 'epf') {
    const s = epfShares(a)
    return { value, figs: <><Fig label="Employee">{rupee(s.employee)}</Fig><Fig label="Employer">{rupee(s.employer)}</Fig><Fig label="EPS">{rupee(s.eps)}</Fig></> }
  }
  if (a.category === 'gold') {
    const g = assetGain(a)
    return { value, figs: <>
      <Fig label="Weight">{Number(a.grams) > 0 ? `${a.grams} g · ${a.karat || 24}K` : '-'}</Fig>
      <Fig label="Paid">{Number(a.paidAmount) > 0 ? rupee(Number(a.paidAmount)) : '-'}</Fig>
      <Fig label="Bought at">{Number(a.buyPricePerGram) > 0 ? `${formatINR(Number(a.buyPricePerGram))} / g` : '-'}</Fig>
      {g && <Fig label="Gain"><Metric amount={g.gain} pct={g.pct} className="text-sm" /></Fig>}
    </> }
  }
  if (a.category === 'etf') {
    const d = etfDetails(a)
    return { value, figs: <>
      <Fig label="Units">{d.units}</Fig><Fig label="Avg price">{formatINR(d.avg, { decimals: true })}</Fig><Fig label="Current">{d.nav ? formatINR(d.nav, { decimals: true }) : '-'}</Fig>
      <Fig label="Invested">{d.invested ? rupee(d.invested) : '-'}</Fig>
      {d.gain != null && <Fig label="Gain"><Metric amount={d.gain} pct={d.pct} className="text-sm" /></Fig>}
    </> }
  }
  const g = assetGain(a)
  const paid = assetInvested(a)
  return { value, figs: <>{paid != null && paid > 0 && <Fig label={['stocks', 'ppf', 'nps'].includes(a.category) ? 'Invested' : 'Bought for'}>{rupee(paid)}</Fig>}{g && <Fig label="Gain"><Metric amount={g.gain} pct={g.pct} className="text-sm" /></Fig>}</> }
}

function Row({ a, onEdit, onDelete }: { a: any; onEdit: (a: any) => void; onDelete: (a: any) => void }) {
  const { figs, value } = details(a)
  return (
    <li className="flex min-w-0 flex-col rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold">{a.name}</p>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">{a.category === 'etf' && a.etfKind ? a.etfKind : ASSET_LABELS[a.category as keyof typeof ASSET_LABELS] ?? a.category} · Updated {formatDate(a.updated)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${a.name}`} onClick={() => onEdit(a)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete ${a.name}`} onClick={() => onDelete(a)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="mt-3"><p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Value</p><p className="text-2xl font-semibold tabular-nums"><Money value={value} /></p></div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3">{figs}</dl>
    </li>
  )
}

/** Assets, one section per kind, each with the figures that matter for it. */
export function AssetSections({ assets, onAdd, onEdit, onDelete, extra, onFilter }: Props) {
  const known = new Set(SECTIONS.map((s) => s.cat))
  const rows = (cat: string) => assets.filter((a) => (known.has(a.category) ? a.category : 'other') === cat)
  const shown = SECTIONS.filter((s) => rows(s.cat).length > 0)
  // show everything, or just one kind (also reachable as ?kind=fd)
  const [only, setOnly] = useState('all')
  useEffect(() => { const k = new URLSearchParams(window.location.search).get('kind'); if (k) setOnly(k) }, [])
  const active = shown.some((s) => s.cat === only) ? only : 'all'
  useEffect(() => { onFilter?.(active) }, [active, onFilter])
  const visible = active === 'all' ? shown : shown.filter((s) => s.cat === active)
  return (
    <div className="space-y-4">
      {shown.length > 1 && (
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {[{ cat: 'all', title: 'All', n: assets.length }, ...shown.map((s) => ({ cat: s.cat, title: s.title, n: rows(s.cat).length }))].map((c) => (
            <button key={c.cat} type="button" aria-pressed={active === c.cat} onClick={() => setOnly(c.cat)}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', active === c.cat ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
              {c.title}<span className={cn('text-xs tabular-nums', active === c.cat ? 'opacity-80' : 'text-muted-foreground')}>{c.n}</span>
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 && <Empty title="No other assets yet" description="Add a fixed deposit, EPF, gold, an ETF or anything else you own, and each gets its own section here." />}
      {visible.map((s) => {
        const list = rows(s.cat)
        const total = list.reduce((n, a) => n + assetValue(a), 0)
        return (
          <Panel key={s.cat} title={s.title} action={<div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-sm font-semibold tabular-nums"><Money value={total} /></span><Button size="sm" variant="outline" onClick={() => onAdd(s.cat)}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button></div>}>
            <ul className="grid gap-3 md:grid-cols-2">{list.map((a) => <Row key={a.id} a={a} onEdit={onEdit} onDelete={onDelete} />)}</ul>
          </Panel>
        )
      })}
    </div>
  )
}
