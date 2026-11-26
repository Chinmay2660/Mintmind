'use client'

import { DetailRows, SummaryHeader } from '@/components/wealth/HoldingUI'
import { GrowwChart } from '@/components/wealth/GrowwChart'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addFund, addFundInvestment, deleteFund, save } from '@/lib/wealth/actions'
import { realisedGains } from '@/lib/wealth/realised'
import { fundMetrics, istNow, nextSipDate, sipPaidThisCycle, toISO } from '@/lib/wealth/calc'
import { mergeFolios, sameFund } from '@/lib/wealth/folios'
import { navSeries } from '@/lib/wealth/fundChart'
import { cap, formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, Metric, LoadingBlock, Panel } from '@/components/wealth/kit'
import { FundForm, InvestmentForm } from '@/components/wealth/FundForms'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { usePrivacyMode } from '@/contexts/PrivacyContext'

const RANGES = ['1M', '3M', '6M', '1Y', 'All'] as const
const FIRST = 5, MORE = 20

/** The investment history: the latest five at first; View all opens the rest in a list that loads more as it is scrolled. */
function History({ rows, folioOf }: { rows: any[]; folioOf?: (id: string) => string | null }) {
  const [all, setAll] = useState(false)
  const [n, setN] = useState(MORE)
  const box = useRef<HTMLUListElement>(null)
  const end = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const el = end.current
    if (!all || !el) return
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setN((v) => v + MORE) }, { root: box.current })
    io.observe(el)
    return () => io.disconnect()
  }, [all, n])
  if (rows.length === 0) return <Empty title="No transactions" />
  const shown = all ? rows.slice(0, n) : rows.slice(0, FIRST)
  return (
    <>
      <ul ref={box} className={all ? 'max-h-96 divide-y divide-border overflow-y-auto' : 'divide-y divide-border'}>
        {shown.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span><span className="block capitalize">{t.type}</span><span className="text-xs text-muted-foreground">{formatDate(t.date)} · {t.units} units @ ₹{t.nav}{folioOf?.(t.fundId) ? ` · ${folioOf(t.fundId)}` : ''}</span></span>
            <Money value={t.amount} className="font-medium" />
          </li>
        ))}
        {all && n < rows.length && <li ref={end} aria-hidden className="h-6" />}
      </ul>
      {rows.length > FIRST && <button type="button" onClick={() => { setAll((v) => !v); setN(MORE) }} className="mt-2 flex min-h-10 w-full items-center justify-center text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{all ? 'Show less' : `View all (${rows.length})`}</button>}
    </>
  )
}

export default function FundDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [dlg, setDlg] = useState<null | { kind: 'edit' | 'del' | 'delAll' | 'folio' | 'inv'; row?: any }>(null)
  const [range, setRange] = useState<(typeof RANGES)[number]>('All')
  const [hover, setHover] = useState<{ x: string; y: number | null; y2?: number } | null>(null) // the point being touched on the chart
  const today = useMemo(() => istNow(), [])
  const opened = data.funds.find((x) => x.id === id)
  // the fund is every folio of it added together; each folio keeps its own units, amount and transactions
  const folios = useMemo(() => (opened ? data.funds.filter((x) => sameFund(opened, x)) : []), [data.funds, opened])
  const merged = useMemo(() => (folios.length ? mergeFolios(folios, data.fundTxns, today) : null), [folios, data.fundTxns, today])
  const f = merged?.f
  const m = merged?.m
  const folioIds = useMemo(() => new Set(folios.map((x) => x.id)), [folios])
  const txns = useMemo(() => data.fundTxns.filter((t) => folioIds.has(t.fundId)).sort((a, b) => a.date.localeCompare(b.date)), [data.fundTxns, folioIds])
  const sips = data.sips.filter((s) => folioIds.has(s.fundId))
  useDetailCrumb(f?.name, () => router.push('/dashboard/mutual-funds'))

  // the real NAV history of the scheme, so the chart follows the market and not just the days of purchase
  const [history, setHistory] = useState<{ date: string; nav: number }[]>([])
  const code = f?.schemeCode
  useEffect(() => {
    if (!code) { setHistory([]); return }
    let live = true
    axios.get(`/api/mfapi/${encodeURIComponent(code)}`, { params: { range: 'MAX' } }).then((r) => { if (live) setHistory(r.data?.history ?? []) }).catch(() => { if (live) setHistory([]) })
    return () => { live = false }
  }, [code])

  // Performance: cumulative invested against units so far at each purchase NAV, ending at today's value
  const perf = useMemo(() => {
    if (!f) return []
    const real = navSeries(history, txns, { date: f.navDate, value: f.currentValue, invested: f.invested }).map((p) => ({ ...p, label: formatDate(p.date) }))
    if (real.length >= 2) return real
    // no NAV history for this fund (not linked, or the service is down): the purchases are the points
    let units = 0, invested = 0
    const pts = txns.map((t) => {
      units += t.units; invested += t.amount
      return { date: t.date, label: formatDate(t.date), invested: Math.round(invested), value: Math.round(units * (t.nav || f.purchaseNav)) }
    })
    if (pts.length) pts.push({ date: f.navDate, label: formatDate(f.navDate), invested: Math.round(f.invested), value: Math.round(f.currentValue) })
    return pts
  }, [txns, f, history])

  const shownPerf = useMemo(() => {
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, All: 0 }[range]
    if (!months) return perf
    const cut = new Date(today); cut.setMonth(cut.getMonth() - months)
    const cutIso = toISO(cut)
    const inRange = perf.filter((p: any) => p.date >= cutIso)
    return inRange.length >= 2 ? inRange : perf.slice(-2) // a short range with fewer than two points shows the last two
  }, [perf, range, today])

  if (!ready) return <LoadingBlock className="h-64" />
  if (!f || !m) return <Empty title="Fund not found" action={<Link className="text-primary underline" href="/dashboard/mutual-funds">Go to funds</Link>} />
  const real = realisedGains(txns)
  const many = folios.length > 1
  const folioName = (fid: string) => (many ? folios.find((x) => x.id === fid)?.folio || 'No folio number' : null)
  const units = (n: number) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 3 })

  return (
    <div className="space-y-5">
      <div className="min-w-0">
        {/* the name is the page title in the top bar, so it is not written again here */}
        {(f.fundHouse || f.category) && <p className="text-sm text-muted-foreground">{[f.fundHouse, f.category].filter(Boolean).join(' · ')}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button className="flex-1 sm:flex-none" onClick={() => setDlg({ kind: 'inv' })}><Plus className="mr-1.5 h-4 w-4" />Add funds</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="outline" aria-label="More for this fund"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDlg({ kind: 'folio' })}><Plus className="mr-2 h-4 w-4" />Add folio</DropdownMenuItem>
            {/* with one folio the fund is that folio; with several, each folio has its own Edit in the list below */}
            {!many && <DropdownMenuItem onClick={() => setDlg({ kind: 'edit', row: folios[0] })}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => setDlg({ kind: 'delAll' })} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete{many ? ' fund' : ''}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SummaryHeader label="Current value" value={<Money value={m.value} />}
        sub={f.prevNav > 0 ? <span className="flex flex-wrap items-center gap-x-2 text-muted-foreground">NAV ₹{f.currentNav} · 1D <Metric arrow={false} amount={(f.currentNav - f.prevNav) * f.units} pct={(f.currentNav / f.prevNav - 1) * 100} digits={2} compact={false} className="text-sm font-semibold" /></span> : <span className="text-muted-foreground">NAV ₹{f.currentNav}</span>}
        stats={[{ label: 'Invested', value: <Money value={m.invested} /> }, { label: 'Returns', value: <Metric arrow={false} amount={m.absReturn} pct={m.absReturnPct} compact={false} className="text-sm font-semibold" /> }]} />
      <section aria-label="How the fund has done">
        {shownPerf.length < 2 ? <Empty title="Not enough history" /> : (() => {
          const last = shownPerf[shownPerf.length - 1]
          const at = hover && hover.y != null ? { label: hover.x, value: hover.y, invested: hover.y2 ?? last.invested } : { label: last.label, value: last.value, invested: last.invested }
          const gain = at.value - at.invested
          const tone = gain > 0 ? 'text-success' : gain < 0 ? 'text-destructive' : 'text-foreground'
          return (
            <>
              {/* what the touched point says is written on the chart itself, top left, where the line is not */}
              <div className="relative">
                <div className="pointer-events-none absolute left-0 top-0 z-10 rounded-lg bg-background/85 px-2 py-1 text-xs leading-snug backdrop-blur-sm" aria-live="polite">
                  <p className="text-muted-foreground">{at.label}</p>
                  <p className="tabular-nums">Value <strong className="font-semibold">{privacyMode ? '••••' : formatINR(at.value)}</strong> · Invested <strong className="font-semibold">{privacyMode ? '••••' : formatINR(at.invested)}</strong></p>
                  <p className={`font-semibold tabular-nums ${tone}`}>{privacyMode ? '••••' : `${gain > 0 ? '+' : gain < 0 ? '-' : ''}${formatINR(Math.abs(gain))}`}{at.invested > 0 && !privacyMode ? ` (${gain > 0 ? '+' : gain < 0 ? '-' : ''}${Math.abs((gain / at.invested) * 100).toFixed(2)}%)` : ''}</p>
                </div>
                <GrowwChart height={240} readout={false} onHover={(p) => setHover(p)} secondLabel="Invested" ariaLabel="Value of the fund against what was invested" format={(v) => (privacyMode ? '••••' : formatINR(v))} data={shownPerf.map((p: any) => ({ x: String(p.label), y: Number(p.value), y2: Number(p.invested) }))} />
              </div>
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

      <Panel title={`Folios (${folios.length})`}>
        <ul className="divide-y divide-border">
          {folios.map((x: any) => {
            const fm = fundMetrics(x, data.fundTxns, today)
            return (
              <li key={x.id} className="flex items-center gap-2 py-3">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{x.folio || 'No folio number'}</span><span className="block text-xs tabular-nums text-muted-foreground">{units(x.units)} units · invested <Money value={fm.invested} /></span></span>
                <span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums"><Money value={fm.value} /></span><Metric arrow={false} amount={fm.absReturn} pct={fm.absReturnPct} className="text-xs" /></span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`More for folio ${x.folio || 'without a number'}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDlg({ kind: 'edit', row: x })}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDlg({ kind: 'del', row: x })} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      </Panel>

      <DetailRows title="Fund details" rows={[
        ...(f.fundHouse ? [{ label: 'Fund house', value: f.fundHouse }] : []),
        ...(f.category ? [{ label: 'Category', value: f.category }] : []),
        ...(f.schemeCode ? [{ label: 'Scheme code', value: String(f.schemeCode) }] : []),
        { label: 'Units held', value: units(f.units) },
        { label: 'Average purchase NAV', value: `₹${m.avgNav}` },
        { label: 'Current NAV', value: `₹${f.currentNav}${f.navDate ? ` · ${formatDate(f.navDate)}` : ''}` },
        ...(real.hasSales ? [{ label: 'Realised gain', value: <Metric arrow={false} amount={real.realised} compact={false} className="text-sm font-semibold" /> }] : []),
        ...(f.notes ? [{ label: 'Notes', value: f.notes }] : []),
      ]} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Investment history"><History rows={[...txns].reverse()} folioOf={folioName} /></Panel>
        <Panel title="SIP">
          {sips.length === 0 ? <Empty title="No SIP on this fund" /> : (
            <ul className="divide-y divide-border">{sips.map((s) => {
              const paid = sipPaidThisCycle(s, today), next = nextSipDate(s, today)
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span><span className="block font-medium"><Money value={s.amount} /> · {cap(s.frequency)}</span><span className="block text-xs text-muted-foreground">{folioName(s.fundId) ? `${folioName(s.fundId)} · ` : ''}{paid ? 'Paid for this cycle' : next ? `Next debit ${formatDate(next)}` : 'No upcoming debit'}</span></span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${paid ? 'bg-success/10 text-success' : 'bg-accent text-accent-foreground'}`}>{paid ? 'Paid' : 'Due'}</span>
                </li>
              )
            })}</ul>
          )}
        </Panel>
      </div>

      {dlg?.kind === 'edit' && <FundForm row={dlg.row} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'funds', r); toast.success('Folio updated') }} />}
      {dlg?.kind === 'folio' && <FundForm folioOf={f} onClose={() => setDlg(null)} onSave={async (r) => { await addFund(db, r); toast.success('Folio added') }} />}
      {dlg?.kind === 'inv' && <InvestmentForm folios={folios} onClose={() => setDlg(null)} onSave={async (v) => { await addFundInvestment(db, v.fundId, v); toast.success('Funds added') }} />}
      <ConfirmDialog open={dlg?.kind === 'delAll'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this fund?" description={many ? `All ${folios.length} folios, with their transactions and SIPs, are removed.` : 'Its transactions and SIPs are removed too.'} confirmLabel="Delete" variant="destructive" onConfirm={async () => {
        for (const x of folios) await deleteFund(db, x.id)
        setDlg(null); toast.success('Fund deleted'); router.push('/dashboard/mutual-funds')
      }} />
      <ConfirmDialog open={dlg?.kind === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this folio?" description="Its transactions and SIPs are removed too." confirmLabel="Delete" variant="destructive" onConfirm={async () => {
        const gone = dlg?.row
        if (!gone) return
        await deleteFund(db, gone.id); setDlg(null); toast.success('Folio deleted')
        const left = folios.find((x: any) => x.id !== gone.id)
        router.push(left ? `/dashboard/mutual-funds/${left.id}` : '/dashboard/mutual-funds')
      }} />
    </div>
  )
}
