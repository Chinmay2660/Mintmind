'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { MoreVertical, Pencil, PiggyBank, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { assetFacts, GROUPS, PROPERTY_GROUPS } from '@/lib/wealth/portfolio'
import { assetGain, assetValue, epfShares, rdMaturityDate, renewFd } from '@/lib/wealth/holdings'
import { ASSET_LABELS } from '@/lib/wealth/labels'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { istNow, toISO } from '@/lib/wealth/calc'
import { LIMITS, fyLabel, fyStart, limitStatus } from '@/lib/wealth/limits'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Money } from '@/components/wealth/Money'
import { AssetForm } from '@/components/wealth/AssetForm'
import { ContributionForm } from '@/components/wealth/LimitsPanel'
import { Empty, LoadingBlock, Metric, Panel, Progress } from '@/components/wealth/kit'
import { DetailRows, SummaryHeader } from '@/components/wealth/HoldingUI'

/** One holding on its own page, the same page as a fund: name, one main action, Edit and Delete in the three dots, the figures, the details. */
export default function HoldingDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, data, db } = useWealth()
  const today = useMemo(() => istNow(), [])
  const [form, setForm] = useState<null | { row?: any }>(null)
  const [del, setDel] = useState<any>(null)
  const [contrib, setContrib] = useState(false)
  const open = (data.assets as any[]).find((a) => a.id === id)
  const tab = open ? [...GROUPS, ...PROPERTY_GROUPS].find((g) => g.cats.includes(open.category))?.key ?? 'other' : 'other'
  const list = ['realEstate', 'vehicle', 'other'].includes(tab) ? '/dashboard' : `/dashboard/mutual-funds?tab=${tab}` // those live in the Overview's Assets
  useDetailCrumb(open?.name, () => router.push(list))
  if (!ready) return <LoadingBlock className="h-64" />
  if (!open) return <Empty title="Holding not found" action={<Link className="text-primary underline" href="/dashboard/mutual-funds">Go to investments</Link>} />
  const facts = assetFacts(open, today)
  return (
    <div className="space-y-5">
      {(() => {
        // the same page as a fund: the name, one main action under it (when there is one), Edit and Delete in the three dots, then the figures
        const renew = renewFd(open, today)
        const primary = renew ? { label: 'Renew', Icon: RefreshCw, run: () => setForm({ row: renew }) } : open.category === 'ppf' || open.category === 'nps' ? { label: 'Add contribution', Icon: PiggyBank, run: () => setContrib(true) } : null
        const menu = (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant={primary ? 'outline' : 'ghost'} className="h-9 w-9 shrink-0" aria-label="More for this holding"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {open.category !== 'epf' && <DropdownMenuItem onClick={() => setForm({ row: open })}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => setDel(open)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
        return (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-sm text-muted-foreground">{[ASSET_LABELS[open.category as keyof typeof ASSET_LABELS] ?? open.category, open.category === 'vehicle' ? open.vehicleType : open.category === 'commodity' ? open.commodityType : null].filter(Boolean).join(' · ')}</p></div>
              {!primary && menu}
            </div>
            {primary && <div className="flex items-center gap-2"><Button className="flex-1 sm:flex-none" onClick={primary.run}><primary.Icon className="mr-1.5 h-4 w-4" />{primary.label}</Button>{menu}</div>}
          </>
        )
      })()}
      {(() => {
        const v = assetValue(open, today), g = assetGain(open, today)
        const sub = [open.ratePct ? `${open.ratePct}% a year` : null, (open.maturityDate || (open.category === 'rd' ? rdMaturityDate(open) : null)) ? `Matures ${formatDate(open.maturityDate || rdMaturityDate(open))}` : null].filter(Boolean).join(' · ')
        return <SummaryHeader label="Current value" value={<Money value={v} />} sub={sub ? <span className="text-muted-foreground">{sub}</span> : undefined} stats={g ? [{ label: 'Invested', value: <Money value={v - g.gain} /> }, { label: 'Returns', value: <Metric arrow={false} amount={g.gain} pct={g.pct} compact={false} className="text-sm font-semibold" /> }] : []} />
      })()}
      {(open.category === 'ppf' || open.category === 'nps') && (() => {
        const st = limitStatus([open], open.category, today), k = open.category as 'ppf' | 'nps'
        return (
          <Panel flat title={`This financial year, ${fyLabel(fyStart(toISO(today)))}`}>
            <Progress value={st.pct} tone={st.over > 0 ? 'danger' : st.pct >= 90 ? 'warning' : 'primary'} label={`${LIMITS[k].label} used this year`} />
            <p className="mt-1.5 text-sm tabular-nums"><strong><Money value={st.used} /></strong> of {formatINR(st.limit)} used{st.over > 0 ? <span className="font-semibold text-destructive"> · over by {formatINR(st.over)}</span> : <span className="text-muted-foreground"> · {formatINR(st.left)} left</span>}</p>
            <p className="text-xs text-muted-foreground">{LIMITS[k].note} Tax rules change, so check the current limit.</p>
          </Panel>
        )
      })()}
      {open.category === 'epf' && (() => {
        // one bar for who the balance belongs to, then only the two figures that matter, instead of a list of amounts
        const e = epfShares(open), total = e.employee + e.employer + e.eps
        const parts = [{ label: 'Your share', value: e.employee, dot: 'bg-primary' }, { label: 'Employer share', value: e.employer, dot: 'bg-primary/55' }, { label: 'EPS (pension)', value: e.eps, dot: 'bg-muted-foreground/40' }]
        return (
          <Panel flat title="Where the balance sits">
            <div role="img" aria-label="Your share, employer share and EPS as parts of the total balance" className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              {parts.map((p) => <span key={p.label} className={p.dot} style={{ width: `${total > 0 ? (p.value / total) * 100 : 0}%` }} />)}
            </div>
            <ul className="mt-3 space-y-2">
              {parts.map((p) => <li key={p.label} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><span aria-hidden className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />{p.label}<span className="text-xs">{total > 0 ? Math.round((p.value / total) * 100) : 0}%</span></span><span className="font-semibold tabular-nums"><Money value={p.value} /></span></li>)}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Interest is credited on the EPF part (your share and the employer share). The EPS pension balance does not earn interest.</p>
          </Panel>
        )
      })()}
      <DetailRows title="Details" rows={facts.filter((f) => open.category !== 'epf' || ['Employer', 'Member ID', 'Updated', 'Notes'].includes(f.label)).map((f) => ({ label: f.label, value: typeof f.value === 'object' ? ('money' in f.value ? <Money value={(f.value as any).money} /> : formatDate((f.value as any).date)) : String(f.value) }))} />
      {form && <AssetForm row={form.row} category={form.row?.category} onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success(form.row?.renewals?.length ? 'Renewed. Set the new maturity date if you know it.' : 'Saved') }} />}
      {contrib && (open.category === 'ppf' || open.category === 'nps') && <ContributionForm kind={open.category} assets={[open]} onClose={() => setContrib(false)} onSave={async (a) => { await save(db, 'assets', a); toast.success('Contribution added') }} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this holding?" description="It is removed from your portfolio and your net worth." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'assets', del.id); setDel(null); toast.success('Deleted'); router.push(list) }} />
    </div>
  )
}
