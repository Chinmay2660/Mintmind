'use client'

import { DetailRows, SummaryHeader } from '@/components/wealth/HoldingUI'
import { GrowwChart } from '@/components/wealth/GrowwChart'
import { BackBar } from '@/components/shell/BackBar'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addFundInvestment, deleteFund, redeemFund, save } from '@/lib/wealth/actions'
import { realisedGains } from '@/lib/wealth/realised'
import { fundMetrics, nextSipDate } from '@/lib/wealth/calc'
import { cap, formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Metric, LoadingBlock, Panel } from '@/components/wealth/kit'
import { FundForm, InvestmentForm, RedeemForm } from '@/components/wealth/FundForms'
import { CopyValue } from '@/components/wealth/CopyButton'
import { usePrivacyMode } from '@/contexts/PrivacyContext'

const RANGES = ['1M', '3M', '6M', '1Y', 'All'] as const

export default function FundDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [dlg, setDlg] = useState<null | 'edit' | 'inv' | 'del' | 'sell'>(null)
  const [range, setRange] = useState<(typeof RANGES)[number]>('All')
  const [hover, setHover] = useState<{ x: string; y: number | null; y2?: number } | null>(null) // the point being touched on the chart
  const f = data.funds.find((x) => x.id === id)
  const txns = useMemo(() => data.fundTxns.filter((t) => t.fundId === id).sort((a, b) => a.date.localeCompare(b.date)), [data.fundTxns, id])
  const sips = data.sips.filter((s) => s.fundId === id)

  // Performance: cumulative invested vs value-at-cost-NAV proxy per instalment (NAV at each purchase * units so far)
  const perf = useMemo(() => {
    if (!f) return []
    let units = 0, invested = 0
    const pts = txns.map((t) => {
      units += t.units; invested += t.amount
      return { date: t.date, label: formatDate(t.date), invested: Math.round(invested), value: Math.round(units * (t.nav || f.purchaseNav)) }
    })
    if (pts.length) pts.push({ date: f.navDate, label: formatDate(f.navDate), invested: Math.round(f.invested), value: Math.round(f.currentValue) })
    return pts
  }, [txns, f])

  const shownPerf = useMemo(() => {
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, All: 0 }[range]
    if (!months) return perf
    const cut = new Date(); cut.setMonth(cut.getMonth() - months)
    const cutIso = cut.toISOString().slice(0, 10)
    const inRange = perf.filter((p: any) => p.date >= cutIso)
    return inRange.length >= 2 ? inRange : perf.slice(-2) // a short range with fewer than two points shows the last two
  }, [perf, range])

  if (!ready) return <LoadingBlock className="h-64" />
  if (!f) return <Empty title="Fund not found" action={<Link className="text-primary underline" href="/dashboard/mutual-funds">Back to funds</Link>} />
  const m = fundMetrics(f, data.fundTxns)
  const real = realisedGains(txns)
  // a fund can be held in more than one folio: the other records of the same scheme
  const sameScheme = (x: any) => (f.schemeCode ? String(x.schemeCode) === String(f.schemeCode) : x.name === f.name)
  const folios = data.funds.filter(sameScheme)

  return (
    <div className="space-y-5">
      <BackBar fallback="/dashboard/mutual-funds" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="text-xl font-semibold">{f.name}</h2></div>
        <div className="grid w-full grid-cols-[1fr_auto_auto] gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => setDlg('inv')}><Plus className="mr-1.5 h-4 w-4" />Add investment</Button>
          <Button size="sm" variant="outline" disabled={!(f.units > 0)} onClick={() => setDlg('sell')}>Record sale</Button>
          <Button size="sm" variant="outline" onClick={() => setDlg('edit')}><Pencil className="h-4 w-4 sm:mr-1.5" /><span className="max-sm:sr-only">Edit</span></Button>
          <Button size="sm" variant="outline" onClick={() => setDlg('del')}><Trash2 className="h-4 w-4 sm:mr-1.5" /><span className="max-sm:sr-only">Delete</span></Button>
        </div>
      </div>
      <SummaryHeader label="Current value" value={<Money value={m.value} />}
        sub={f.prevNav > 0 ? <span className="flex flex-wrap items-center gap-x-2 text-muted-foreground">NAV ₹{f.currentNav} · 1 day <Metric amount={(f.currentNav - f.prevNav) * f.units} compact={false} decimals className="text-sm font-semibold" /></span> : <span className="text-muted-foreground">NAV ₹{f.currentNav}</span>}
        stats={[{ label: 'Invested', value: <Money value={m.invested} compact /> }, { label: 'Returns', value: <Metric amount={m.absReturn} className="text-sm font-semibold" />, sub: <Metric pct={m.absReturnPct} className="text-xs" /> }, { label: 'XIRR', value: <Metric pct={m.xirrPct} hint="Needs at least two dated cashflows" className="text-sm font-semibold" /> }]} />
      <section aria-label="How the fund has done">
        {shownPerf.length < 2 ? <Empty title="Not enough history" /> : (() => {
          const last = shownPerf[shownPerf.length - 1]
          const at = hover && hover.y != null ? { label: hover.x, value: hover.y, invested: hover.y2 ?? last.invested } : { label: last.label, value: last.value, invested: last.invested }
          const gain = at.value - at.invested
          const tone = gain > 0 ? 'text-success' : gain < 0 ? 'text-destructive' : 'text-foreground'
          return (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm" aria-live="polite">
                <span className="text-muted-foreground">{at.label}</span>
                <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span>Value <strong className="font-semibold tabular-nums">{privacyMode ? '••••' : formatINR(at.value)}</strong></span>
                  <span>Invested <strong className="font-semibold tabular-nums">{privacyMode ? '••••' : formatINR(at.invested)}</strong></span>
                  <span className={tone}>{privacyMode ? '••••' : `${gain > 0 ? '+' : gain < 0 ? '-' : ''}${formatINR(Math.abs(gain))}`}{at.invested > 0 && !privacyMode ? ` (${gain > 0 ? '+' : gain < 0 ? '-' : ''}${Math.abs((gain / at.invested) * 100).toFixed(2)}%)` : ''}</span>
                </span>
              </div>
              <GrowwChart height={240} readout={false} onHover={(p) => setHover(p)} secondLabel="Invested" ariaLabel="Value of the fund against what was invested" format={(v) => (privacyMode ? '••••' : formatINR(v))} data={shownPerf.map((p: any) => ({ x: String(p.label), y: Number(p.value), y2: Number(p.invested) }))} />
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>{shownPerf[0].label}</span><span>{last.label}</span></div>
              <div role="group" aria-label="Chart range" className="mt-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-4 rounded bg-primary" />Value</span><span className="flex items-center gap-1.5"><span aria-hidden className="h-0 w-4 border-t-2 border-dashed border-muted-foreground" />Invested</span></span>
                <span className="flex items-center gap-1">
                  {RANGES.map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => { setRange(r); setHover(null) }} className={`min-h-9 min-w-11 rounded-full px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${range === r ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{r}</button>)}
                </span>
              </div>
            </>
          )
        })()}
      </section>
      {folios.length > 1 && (
        <Panel title={`Folios (${folios.length})`}>
          <ul className="divide-y divide-border">
            {folios.map((x: any) => {
              const fm = fundMetrics(x, data.fundTxns)
              const here = x.id === f.id
              const row = (
                <>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{x.folio || 'No folio number'}{here && <span className="ml-2 text-xs font-normal text-muted-foreground">this folio</span>}</span><span className="block text-xs text-muted-foreground tabular-nums">{Number(x.units).toLocaleString('en-IN', { maximumFractionDigits: 3 })} units · invested <Money value={fm.invested} /></span></span>
                  <span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums"><Money value={fm.value} /></span><Metric amount={fm.absReturn} pct={fm.absReturnPct} className="text-xs" /></span>
                </>
              )
              return <li key={x.id}>{here ? <div className="flex items-center justify-between gap-3 py-3">{row}</div> : <Link href={`/dashboard/mutual-funds/${x.id}`} className="flex items-center justify-between gap-3 py-3 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">{row}</Link>}</li>
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">To add another folio of this fund, use Add fund and pick the same fund with its folio number.</p>
        </Panel>
      )}
      <DetailRows title="Fund details" rows={[
        { label: 'Folio number', value: f.folio ? <CopyValue value={f.folio} label="Folio number" mono /> : '-' },
        ...(f.fundHouse ? [{ label: 'Fund house', value: f.fundHouse }] : []),
        ...(f.category ? [{ label: 'Category', value: f.category }] : []),
        { label: 'Investment type', value: f.investmentType || '-' },
        ...(f.investmentDate ? [{ label: 'First investment', value: formatDate(f.investmentDate) }] : []),
        ...(f.schemeCode ? [{ label: 'Scheme code', value: String(f.schemeCode) }] : []),
        { label: 'Units held', value: Number(f.units).toLocaleString('en-IN', { maximumFractionDigits: 3 }) },
        { label: 'Average purchase NAV', value: `₹${m.avgNav}` },
        { label: 'Current NAV', value: `₹${f.currentNav}${f.navDate ? ` · ${formatDate(f.navDate)}` : ''}` },
        ...(real.hasSales ? [{ label: 'Realised gain', value: <Metric amount={real.realised} compact={false} className="text-sm font-semibold" /> }] : []),
        ...(f.notes ? [{ label: 'Notes', value: f.notes }] : []),
      ]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Investment history">
          {txns.length === 0 ? <Empty title="No transactions" /> : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {[...txns].reverse().map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><span className="block capitalize">{t.type}</span><span className="text-xs text-muted-foreground">{formatDate(t.date)} · {t.units} units @ ₹{t.nav}</span></span><Money value={t.amount} className="font-medium" /></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="SIPs on this fund">
          {sips.length === 0 ? <Empty title="No SIP" /> : (
            <ul className="divide-y divide-border">{sips.map((s) => (
              <li key={s.id} className="py-2.5 text-sm"><p className="font-medium"><Money value={s.amount} /> · {cap(s.frequency)} <span className="text-xs font-normal capitalize text-muted-foreground">· {s.status}</span></p><p className="text-xs text-muted-foreground">{s.instalmentsCompleted}/{s.instalmentsTotal || '∞'} instalments · Started {formatDate(s.startDate)}{nextSipDate(s) ? ` · Next ${formatDate(nextSipDate(s)!)}` : ''}</p></li>
            ))}</ul>
          )}
        </Panel>
      </div>
      {dlg === 'edit' && <FundForm row={f} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'funds', r); toast.success('Fund updated') }} />}
      {dlg === 'sell' && <RedeemForm fund={f} onClose={() => setDlg(null)} onSave={async (v) => { const r = await redeemFund(db, f.id, v); toast.success(r.gain >= 0 ? `Sale recorded. Realised gain ${formatINR(r.gain)}` : `Sale recorded. Realised loss ${formatINR(Math.abs(r.gain))}`) }} />}
      {dlg === 'inv' && <InvestmentForm fund={f} onClose={() => setDlg(null)} onSave={async (v) => { await addFundInvestment(db, f.id, v); toast.success('Investment added') }} />}
      <ConfirmDialog open={dlg === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this fund?" description="Its transactions and SIPs are removed too." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await deleteFund(db, f.id); toast.success('Fund deleted'); router.push('/dashboard/mutual-funds') }} />
    </div>
  )
}
