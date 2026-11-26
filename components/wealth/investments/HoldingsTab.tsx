'use client'

import { returnTotals } from '@/lib/wealth/holdingsTotals'
import { istNow, toISO } from '@/lib/wealth/calc'
import { BackBar } from '@/components/shell/BackBar'
import { useMemo, useState, type ReactNode } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { ChevronRight, Pencil, PiggyBank, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { assetFacts, depositGroups, GROUPS, PROPERTY_GROUPS } from '@/lib/wealth/portfolio'
import { assetGain, assetValue, renewFd } from '@/lib/wealth/holdings'
import { ASSET_LABELS } from '@/lib/wealth/labels'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Money } from '../Money'
import { AssetForm } from '../AssetForm'
import { ContributionForm } from '../LimitsPanel'
import { Empty, Metric, PageHeader, Panel, Progress } from '../kit'
import { LIMITS, fyLabel, fyStart, limitStatus } from '@/lib/wealth/limits'
import { DetailRows, SummaryHeader } from '../HoldingUI'

/** One list of holdings, with a line between rows (the same list as the fund list). */
function HoldingList({ title, children }: { title?: string; children: ReactNode }) {
  if (!children) return null
  return (
    <section>
      {title && <h3 className="mb-1 text-sm font-semibold text-muted-foreground">{title}</h3>}
      <ul className="divide-y divide-border border-y border-border">{children}</ul>
    </section>
  )
}

type Kind = 'fd' | 'rd' | 'epf' | 'ppf' | 'nps' | 'market' | 'gold' | 'esop' | 'realEstate' | 'vehicle' | 'other'
const SINGULAR: Record<Kind, string> = { fd: 'fixed deposit', rd: 'recurring deposit', epf: 'EPF account', ppf: 'PPF account', nps: 'NPS account', market: 'stock or ETF', gold: 'gold holding', esop: 'ESOP or RSU grant', realEstate: 'property', vehicle: 'vehicle', other: 'asset' }

/**
 * One section of the portfolio: fixed deposits, recurring deposits, retirement accounts, stocks and ETFs, or gold.
 * Holdings are grouped, show their value and what they have earned, and open in place to every detail you recorded.
 */
export function HoldingsTab({ kind }: { kind: Kind }) {
  const { data, db } = useWealth()
  const today = useMemo(() => istNow(), [])
  const group = [...GROUPS, ...PROPERTY_GROUPS].find((g) => g.key === kind)!
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
    const sub = extra?.sub ?? (a.category === 'vehicle' ? a.vehicleType : group.cats.length > 1 ? ASSET_LABELS[a.category as keyof typeof ASSET_LABELS] ?? a.category : undefined)
    return (
      <li key={a.id}>
        <button type="button" onClick={() => setSel(a.id)} aria-label={`${a.name}, open details`} className="flex min-h-[4.25rem] w-full items-center gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-sm font-semibold leading-snug">{a.name}</span>
            {sub && <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>}
          </span>
          <span className="flex h-10 w-28 shrink-0 flex-col justify-center text-right">
            <span className="block whitespace-nowrap text-sm font-semibold tabular-nums"><Money value={v} /></span>
            {extra?.interest != null ? <span className="block whitespace-nowrap text-xs tabular-nums text-success">+{formatINR(extra.interest)}</span> : g ? <span className="block"><Metric arrow={false} amount={g.gain} className="text-xs" /></span> : <span className="block text-xs text-muted-foreground">-</span>}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </li>
    )
  }

  const depositRow = (x: any) => row(x.a, { interest: x.interest, sub: kind === 'fd' ? `${x.matured ? 'Matured' : x.a.maturityDate ? `Matures ${formatDate(x.a.maturityDate)}${x.daysLeft != null ? ` · ${x.daysLeft} days` : ''}` : 'No maturity date'}` : `${x.paid} of ${x.tenure || '?'} instalments` })

  if (open) {
    const facts = assetFacts(open, today)
    return (
      <div className="space-y-5">
        <BackBar onBack={() => setSel(null)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-semibold">{open.name}</h2><p className="text-xs text-muted-foreground">{ASSET_LABELS[open.category as keyof typeof ASSET_LABELS] ?? open.category}</p></div>
          <div className="flex flex-wrap gap-2">
            {/* a matured FD can be renewed in one step; a PPF or NPS account takes a contribution without leaving this page */}
            {renewFd(open, today) && <Button size="sm" onClick={() => setForm({ row: renewFd(open, today) })}><RefreshCw className="mr-1.5 h-4 w-4" />Renew</Button>}
            {(open.category === 'ppf' || open.category === 'nps') && <Button size="sm" onClick={() => setContrib(true)}><PiggyBank className="mr-1.5 h-4 w-4" />Add contribution</Button>}
            <Button size="sm" variant="outline" onClick={() => setForm({ row: open })}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button><Button size="sm" variant="outline" onClick={() => setDel(open)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button></div>
        </div>
        {(() => { const v = assetValue(open, today), g = assetGain(open, today); return <SummaryHeader label="Current value" value={<Money value={v} />} stats={g ? [{ label: 'Invested', value: <Money value={v - g.gain} compact /> }, { label: 'Returns', value: <Metric amount={g.gain} className="text-sm font-semibold" /> }, { label: 'Returns %', value: <Metric pct={g.pct} className="text-sm font-semibold" /> }] : []} /> })()}
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
        <DetailRows title="Details" rows={facts.map((f) => ({ label: f.label, value: typeof f.value === 'object' ? ('money' in f.value ? <Money value={(f.value as any).money} /> : formatDate((f.value as any).date)) : String(f.value) }))} />
        {form && <AssetForm row={form.row} category={form.row?.category} onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success(form.row?.renewals?.length ? 'Renewed. Set the new maturity date if you know it.' : 'Saved') }} />}
        {contrib && (open.category === 'ppf' || open.category === 'nps') && <ContributionForm kind={open.category} assets={[open]} onClose={() => setContrib(false)} onSave={async (a) => { await save(db, 'assets', a); toast.success('Contribution added') }} />}
        <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this holding?" description="It is removed from your portfolio and your net worth." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'assets', del.id); setDel(null); setSel(null); toast.success('Deleted') }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="absolute"><PageHeader primaryAction={{ label: `Add ${SINGULAR[kind]}`, onClick: () => setForm({}) }} /></div>
      {items.length > 0 && (() => {
        const t = returnTotals(items.map((x) => { const g = assetGain(x, today); return { value: assetValue(x, today), gain: g ? g.gain : null } }))
        // a holding with no cost recorded has no return to show, so those rows only appear when there is something to say
        const rows: { label: string; value: ReactNode }[] = deposits
          ? [{ label: kind === 'fd' ? 'Deposited' : 'Put in', value: <Money value={deposits.invested} /> }, { label: 'Interest earned', value: <span className="text-success">+<Money value={deposits.interest} /></span> }, ...(deposits.avgRate != null ? [{ label: 'Average rate', value: `${deposits.avgRate}%` }] : [])]
          : [...(t.gain != null ? [{ label: 'Invested value', value: <Money value={t.value - t.gain} /> }, { label: 'Total returns', value: <span className="flex items-center gap-1.5"><Metric arrow={false} amount={t.gain} compact={false} className="text-sm font-semibold" />{t.pct != null && <span>(<Metric arrow={false} pct={t.pct} className="text-sm font-semibold" />)</span>}</span> }] : []), { label: 'Holdings', value: items.length }]
        return (
          <section aria-label={`${group.label} overview`} className="surface-card px-4">
            <p className="pt-4 text-sm text-muted-foreground">Current value</p>
            <p className="text-3xl font-bold tabular-nums"><Money value={deposits ? deposits.value : t.value} /></p>
            <dl className="space-y-2.5 py-4 text-sm">
              {rows.map((r) => <div key={r.label} className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{r.label}</dt><dd className="font-semibold tabular-nums">{r.value}</dd></div>)}
            </dl>
          </section>
        )
      })()}
      {items.length === 0 ? (
        <Empty title={`Nothing added under ${group.label} yet`} description={`Add a ${SINGULAR[kind]} to see its details and what it has earned.`} action={<Button onClick={() => setForm({})}>Add {SINGULAR[kind]}</Button>} />
      ) : deposits ? (
        <>
          <HoldingList title={`Running (${deposits.running.length})`}>{deposits.running.length ? deposits.running.map(depositRow) : null}</HoldingList>
          {deposits.matured.length > 0 && <HoldingList title={`Matured (${deposits.matured.length})`}>{deposits.matured.map(depositRow)}</HoldingList>}
        </>
      ) : (
        group.cats.map((cat) => {
          const list = items.filter((a) => a.category === cat)
          return list.length ? <HoldingList key={cat} title={group.cats.length > 1 ? `${ASSET_LABELS[cat as keyof typeof ASSET_LABELS] ?? cat} (${list.length})` : undefined}>{list.map((a) => row(a))}</HoldingList> : null
        })
      )}
      {form && <AssetForm row={form.row} category={group.cats[0]} onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success('Saved') }} />}
    </div>
  )
}
