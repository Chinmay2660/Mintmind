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

export default function FundDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [dlg, setDlg] = useState<null | 'edit' | 'inv' | 'del' | 'sell'>(null)
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

  if (!ready) return <LoadingBlock className="h-64" />
  if (!f) return <Empty title="Fund not found" action={<Link className="text-primary underline" href="/dashboard/mutual-funds">Back to funds</Link>} />
  const m = fundMetrics(f, data.fundTxns)
  const real = realisedGains(txns)

  return (
    <div className="space-y-5">
      <BackBar fallback="/dashboard/mutual-funds" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="text-xl font-semibold">{f.name}</h2><p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">Folio <CopyValue value={f.folio} label="Folio number" mono /></p></div>
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
      <Panel title="Performance">
        {perf.length < 2 ? <Empty title="Not enough history" /> : (
          <GrowwChart height={200} secondLabel="Invested" ariaLabel="Value of the fund against what was invested" format={(v) => (privacyMode ? '••••' : formatINR(v))} data={perf.map((p: any) => ({ x: String(p.label), y: Number(p.value), y2: Number(p.invested) }))} />
        )}
      </Panel>
      <DetailRows title="Holding details" rows={[
        { label: 'Units', value: f.units },
        { label: 'Average NAV', value: `₹${m.avgNav}` },
        { label: 'Current NAV', value: `₹${f.currentNav} · ${formatDate(f.navDate)}` },
        ...(real.hasSales ? [{ label: 'Realised gain', value: <Metric amount={real.realised} compact={false} className="text-sm font-semibold" /> }] : []),
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
