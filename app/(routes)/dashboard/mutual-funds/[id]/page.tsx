'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addFundInvestment, deleteFund, save, updateNav } from '@/lib/wealth/actions'
import { fundMetrics, nextSipDate } from '@/lib/wealth/calc'
import { cap, formatDate, formatINR, formatPct } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Delta, Empty, LoadingBlock, Panel, Stat, chartAxis, chartColor, chartGrid, chartTooltipStyle } from '@/components/wealth/kit'
import { FundForm, InvestmentForm, NavForm } from '@/components/wealth/FundForms'
import { CopyButton, CopyValue } from '@/components/wealth/CopyButton'
import { usePrivacyMode } from '@/contexts/PrivacyContext'

export default function FundDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [dlg, setDlg] = useState<null | 'edit' | 'nav' | 'inv' | 'del'>(null)
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

  return (
    <div className="space-y-5">
      <Link href="/dashboard/mutual-funds" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Mutual funds</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="text-xl font-semibold">{f.name}</h2><p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">Folio <CopyValue value={f.folio} label="Folio number" mono /></p></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDlg('nav')}><RefreshCw className="mr-1.5 h-4 w-4" />Update NAV</Button>
          <Button size="sm" variant="outline" onClick={() => setDlg('inv')}><Plus className="mr-1.5 h-4 w-4" />Add investment</Button>
          <Button size="sm" variant="outline" onClick={() => setDlg('edit')}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
          <Button size="sm" variant="outline" onClick={() => setDlg('del')}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invested" value={<Money value={m.invested} />} />
        <Stat label="Current value" value={<Money value={m.value} />} />
        <Stat label="Return" value={<Delta amount={m.absReturn} pct={m.absReturnPct} className="text-base" />} />
        <Stat label="XIRR" value={m.xirrPct == null ? '—' : formatPct(m.xirrPct, 1)} />
        <Stat label="Units" value={f.units} />
        <Stat label="Average NAV" value={`₹${m.avgNav}`} />
        <Stat label="Current NAV" value={`₹${f.currentNav}`} hint={`as of ${formatDate(f.navDate)} (${f.navSource})`} />
        <Stat label="Day change" value={f.prevNav > 0 ? <Money value={(f.currentNav - f.prevNav) * f.units} signed decimals /> : '—'} hint={f.prevNav > 0 ? `prev NAV ₹${f.prevNav}` : 'Needs previous NAV'} />
      </div>
      <Panel title="Performance" description="Invested vs value at each purchase NAV; latest point uses current NAV">
        {perf.length < 2 ? <Empty title="Not enough history" /> : (
          <div className="h-64" role="img" aria-label="Fund performance chart">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={perf} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="label" {...chartAxis} minTickGap={32} />
              <YAxis {...chartAxis} width={56} tickFormatter={(v) => (privacyMode ? '••' : `${Math.round(v / 1000)}k`)} />
              <Tooltip {...chartTooltipStyle} formatter={(v: number) => (privacyMode ? '••••' : formatINR(v))} />
              <Line type="stepAfter" dataKey="invested" name="Invested" stroke={chartColor(3)} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="value" name="Value" stroke={chartColor(1)} strokeWidth={2.5} dot={false} />
            </LineChart></ResponsiveContainer>
          </div>
        )}
      </Panel>
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
      {dlg === 'nav' && <NavForm fund={f} onClose={() => setDlg(null)} onSave={async (nav, date) => { await updateNav(db, f.id, nav, date); toast.success('NAV updated') }} />}
      {dlg === 'inv' && <InvestmentForm fund={f} onClose={() => setDlg(null)} onSave={async (v) => { await addFundInvestment(db, f.id, v); toast.success('Investment added') }} />}
      <ConfirmDialog open={dlg === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this fund?" description="Its transactions and SIPs are removed too." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await deleteFund(db, f.id); toast.success('Fund deleted'); router.push('/dashboard/mutual-funds') }} />
    </div>
  )
}
