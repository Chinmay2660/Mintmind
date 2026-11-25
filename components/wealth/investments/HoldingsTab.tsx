'use client'

import { useMemo, useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { ArrowLeft, ChevronRight, Pencil, PiggyBank, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { assetFacts, depositGroups, GROUPS } from '@/lib/wealth/portfolio'
import { assetGain, assetValue, renewFd } from '@/lib/wealth/holdings'
import { ASSET_LABELS } from '@/lib/wealth/labels'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Money } from '../Money'
import { AssetForm } from '../AssetForm'
import { ContributionForm } from '../LimitsPanel'
import { Empty, Metric, PageHeader, Panel, Stat } from '../kit'

type Kind = 'fd' | 'rd' | 'retirement' | 'market' | 'gold' | 'property'
const SINGULAR: Record<Kind, string> = { fd: 'fixed deposit', rd: 'recurring deposit', retirement: 'retirement account', market: 'stock or ETF', gold: 'gold holding', property: 'asset' }
// Things you own that are not investments. They count in net worth but not in the investment returns.
const PROPERTY_GROUP = { key: 'property', label: 'Property & other', cats: ['realEstate', 'vehicle', 'other'] }

/**
 * One section of the portfolio: fixed deposits, recurring deposits, retirement accounts, stocks and ETFs, or gold.
 * Holdings are grouped, show their value and what they have earned, and open in place to every detail you recorded.
 */
export function HoldingsTab({ kind }: { kind: Kind }) {
  const { data, db } = useWealth()
  const today = useMemo(() => new Date(), [])
  const group = kind === 'property' ? PROPERTY_GROUP : GROUPS.find((g) => g.key === kind)!
  const items = useMemo(() => (data.assets as any[]).filter((a) => group.cats.includes(a.category)), [data.assets, group.cats])
  const [sel, setSel] = useState<string | null>(null)
  const [form, setForm] = useState<null | { row?: any }>(null)
  useAddParam((what) => { if (what === 'asset') setForm({}) })
  const [del, setDel] = useState<any>(null)
  const [contrib, setContrib] = useState(false)
  const open = sel ? items.find((a) => a.id === sel) : undefined
  useDetailCrumb(open ? open.name : null, () => setSel(null))
  const deposits = kind === 'fd' || kind === 'rd' ? depositGroups(items, kind, today) : null

  const row = (a: any, extra?: { interest?: number; sub?: string }) => {
    const v = assetValue(a, today), g = assetGain(a, today)
    return (
      <li key={a.id}>
        <button type="button" onClick={() => setSel(a.id)} aria-label={`${a.name}, open details`} className="flex w-full items-center gap-3 py-3 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{a.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{extra?.sub ?? ASSET_LABELS[a.category as keyof typeof ASSET_LABELS] ?? a.category}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-sm font-semibold tabular-nums"><Money value={v} /></span>
            {extra?.interest != null ? <span className="block text-xs text-success tabular-nums">+{formatINR(extra.interest)} interest</span> : g ? <Metric amount={g.gain} pct={g.pct} className="text-xs" /> : null}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </li>
    )
  }

  const depositRow = (x: any) => row(x.a, { interest: x.interest, sub: kind === 'fd' ? `${x.a.ratePct ? `${x.a.ratePct}% · ` : ''}${x.matured ? 'Matured' : x.a.maturityDate ? `Matures ${formatDate(x.a.maturityDate)}${x.daysLeft != null ? ` · ${x.daysLeft} days` : ''}` : 'No maturity date'}` : `${x.a.ratePct ? `${x.a.ratePct}% · ` : ''}${x.paid} of ${x.tenure || '?'} instalments` })

  if (open) {
    const facts = assetFacts(open, today)
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => setSel(null)} className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" />All {group.label.toLowerCase()}</button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-semibold">{open.name}</h2><p className="text-xs text-muted-foreground">{ASSET_LABELS[open.category as keyof typeof ASSET_LABELS] ?? open.category}</p></div>
          <div className="flex flex-wrap gap-2">
            {/* a matured FD can be renewed in one step; a PPF or NPS account takes a contribution without leaving this page */}
            {renewFd(open, today) && <Button size="sm" onClick={() => setForm({ row: renewFd(open, today) })}><RefreshCw className="mr-1.5 h-4 w-4" />Renew</Button>}
            {(open.category === 'ppf' || open.category === 'nps') && <Button size="sm" onClick={() => setContrib(true)}><PiggyBank className="mr-1.5 h-4 w-4" />Add contribution</Button>}
            <Button size="sm" variant="outline" onClick={() => setForm({ row: open })}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button><Button size="sm" variant="outline" onClick={() => setDel(open)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button></div>
        </div>
        <Panel title="Details">
          <dl className="divide-y divide-border">
            {facts.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="text-right font-medium tabular-nums">{typeof f.value === 'object' ? ('money' in f.value ? <Money value={(f.value as any).money} /> : formatDate((f.value as any).date)) : String(f.value)}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        {form && <AssetForm row={form.row} category={form.row?.category} onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success(form.row?.renewals?.length ? 'Renewed. Set the new maturity date if you know it.' : 'Saved') }} />}
        {contrib && (open.category === 'ppf' || open.category === 'nps') && <ContributionForm kind={open.category} assets={[open]} onClose={() => setContrib(false)} onSave={async (a) => { await save(db, 'assets', a); toast.success('Contribution added') }} />}
        <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this holding?" description="It is removed from your portfolio and your net worth." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'assets', del.id); setDel(null); setSel(null); toast.success('Deleted') }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader primaryAction={{ label: `Add ${SINGULAR[kind]}`, onClick: () => setForm({}) }} />
      {deposits && items.length > 0 && (
        <section aria-label="Summary" className="grid grid-cols-1 gap-3 border-b border-border pb-5 min-[460px]:grid-cols-2 lg:grid-cols-4">
          <Stat label={kind === 'fd' ? 'Deposited' : 'Put in so far'} value={<Money value={deposits.invested} />} />
          <Stat label="Value today" value={<Money value={deposits.value} />} />
          <Stat label="Interest earned" value={<Money value={deposits.interest} />} />
          <Stat label="Average rate" value={deposits.avgRate != null ? `${deposits.avgRate}%` : '-'} hint={`${items.length} ${items.length === 1 ? 'deposit' : 'deposits'}`} />
        </section>
      )}
      {items.length === 0 ? (
        <Empty title={`No ${group.label.toLowerCase()} yet`} description={`Add a ${SINGULAR[kind]} to see its details and what it has earned.`} action={<Button onClick={() => setForm({})}>Add {SINGULAR[kind]}</Button>} />
      ) : deposits ? (
        <>
          <Panel title={`Running (${deposits.running.length})`}>{deposits.running.length ? <ul className="divide-y divide-border">{deposits.running.map(depositRow)}</ul> : <p className="text-sm text-muted-foreground">None running.</p>}</Panel>
          {deposits.matured.length > 0 && <Panel title={`Matured (${deposits.matured.length})`}><ul className="divide-y divide-border">{deposits.matured.map(depositRow)}</ul></Panel>}
        </>
      ) : (
        group.cats.map((cat) => {
          const list = items.filter((a) => a.category === cat)
          if (!list.length) return null
          return <Panel key={cat} title={`${ASSET_LABELS[cat as keyof typeof ASSET_LABELS] ?? cat} (${list.length})`}><ul className="divide-y divide-border">{list.map((a) => row(a))}</ul></Panel>
        })
      )}
      {form && <AssetForm row={form.row} category={group.cats[0]} onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success('Saved') }} />}
    </div>
  )
}
