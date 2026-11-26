'use client'

import { returnTotals } from '@/lib/wealth/holdingsTotals'
import { istNow } from '@/lib/wealth/calc'
import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { ArrowLeftRight, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { save } from '@/lib/wealth/actions'
import { commoditySlug, commodityType, depositGroups, GROUPS, PROPERTY_GROUPS } from '@/lib/wealth/portfolio'
import { assetGain, assetValue } from '@/lib/wealth/holdings'
import { ASSET_LABELS } from '@/lib/wealth/labels'
import { formatDate, formatINR, timeLeft } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Money } from '../Money'
import { AssetForm } from '../AssetForm'
import { Empty, Metric, PageHeader } from '../kit'
import { PdfStatementImport } from '../PdfStatementImport'
import { epfShares } from '@/lib/wealth/holdings'

/** One list of holdings, with a line between rows (the same list as the fund list). */
function HoldingList({ title, children }: { title?: string; children: ReactNode }) {
  if (!children || (Array.isArray(children) && children.every((x) => !x))) return null // no rows, no line
  return (
    <section>
      {title && <h3 className="mb-1 text-sm font-semibold text-muted-foreground">{title}</h3>}
      <ul className="divide-y divide-border border-y border-border">{children}</ul>
    </section>
  )
}

/** How a tab's holdings are ordered, and which figures show on the right of every row (the same controls as the fund list). */
type DSort = 'maturity' | 'value' | 'invested' | 'rate' | 'pct' | 'gain'
const D_SORT: Record<DSort, string> = { maturity: 'Maturity date', value: 'Current value', invested: 'Invested amount', rate: 'Interest rate', pct: 'Returns (%)', gain: 'Absolute gain (₹)' }
type DMetric = 'value' | 'returns' | 'rate' | 'split'
const D_METRIC: Record<DMetric, string> = { value: 'Current (Invested)', returns: 'Returns (%)', rate: 'Interest rate', split: 'EPF and EPS' }
/** "Fixed deposit (HDFC Bank)" reads as "HDFC Bank" inside the Fixed deposits tab, where every row is one. */
const shortName = (n: string) => String(n).replace(/^(?:fixed|recurring) deposit\s*\((.*)\)$/i, '$1')

type Kind = 'fd' | 'rd' | 'epf' | 'ppf' | 'nps' | 'market' | 'gold' | 'esop' | 'realEstate' | 'vehicle' | 'other'
const SINGULAR: Record<Kind, string> = { fd: 'fixed deposit', rd: 'recurring deposit', epf: 'EPF account', ppf: 'PPF account', nps: 'NPS account', market: 'stock or ETF', gold: 'gold or other commodity', esop: 'ESOP or RSU grant', realEstate: 'property', vehicle: 'vehicle', other: 'asset' }

/**
 * One section of the portfolio: fixed deposits, recurring deposits, retirement accounts, stocks and ETFs, or gold.
 * Holdings are grouped, show their value and what they have earned, and open in place to every detail you recorded.
 */
export function HoldingsTab({ kind, embedded = false }: { kind: Kind; /** shown inside another page (the Overview's Assets): its own Add button instead of the page's floating one */ embedded?: boolean }) {
  const { data, db } = useWealth()
  const today = useMemo(() => istNow(), [])
  const group = [...GROUPS, ...PROPERTY_GROUPS].find((g) => g.key === kind)!
  const items = useMemo(() => (data.assets as any[]).filter((a) => group.cats.includes(a.category)), [data.assets, group.cats])
  const [form, setForm] = useState<null | { row?: any }>(null)
  useAddParam((what) => { if (what === 'asset') setForm({}) })
  const [pickedSort, setDSort] = useState<DSort>('maturity') // deposits start with the soonest maturity, other tabs with the biggest
  const [pickedMetric, setDMetric] = useState<DMetric>('value')
  const [dPanel, setDPanel] = useState(false)
  const mixed = group.cats.filter((cat) => items.some((a) => a.category === cat)).length > 1 // a kind is only named when the tab holds more than one
  const deposits = kind === 'fd' || kind === 'rd' ? depositGroups(items, kind, today) : null
  const sortOpts: DSort[] = deposits ? ['maturity', 'value', 'invested', 'rate'] : ['value', 'pct', 'gain', 'invested']
  const metricOpts: DMetric[] = deposits ? ['value', 'returns', 'rate'] : kind === 'epf' ? ['value', 'split', 'returns'] : ['value', 'returns']
  const dSort = sortOpts.includes(pickedSort) ? pickedSort : sortOpts[0]
  const dMetric = metricOpts.includes(pickedMetric) ? pickedMetric : metricOpts[0]
  // one shape for every holding: its value, what went in and what it earned (both left out when no cost is recorded)
  const entry = (a: any) => { const v = assetValue(a, today), g = assetGain(a, today); return { a, value: v, invested: g ? v - g.gain : null, interest: g ? g.gain : null } as any }
  const dKey: Record<DSort, (x: any) => number | string> = { pct: (x) => (x.invested > 0 && x.interest != null ? -(x.interest / x.invested) : 1e9), gain: (x) => (x.interest != null ? -x.interest : 1e12), maturity: (x) => x.maturityDate || x.a.maturityDate || '9999', value: (x) => -x.value, invested: (x) => -(x.invested ?? 0), rate: (x) => -(Number(x.a.ratePct) || 0) }
  const dOrder = (list: any[]) => [...list].sort((p, q) => { const a = dKey[dSort](p), b = dKey[dSort](q); return typeof a === 'string' ? a.localeCompare(String(b)) : a - (b as number) })

  const depositRow = (x: any) => {
    const a = x.a, pct = x.invested > 0 && x.interest != null ? (x.interest / x.invested) * 100 : null
    const sub = x.count != null ? `${x.count} ${x.count === 1 ? 'purchase' : 'purchases'}` : deposits ? (kind === 'fd' ? (x.matured ? 'Matured' : a.maturityDate ? `Matures ${formatDate(a.maturityDate)}${x.daysLeft != null ? ` · ${timeLeft(today, a.maturityDate)} left` : ''}` : 'No maturity date') : (x.matured ? 'Matured' : x.maturityDate ? `Matures ${formatDate(x.maturityDate)} · ${timeLeft(today, x.maturityDate)} left` : `${x.paid} of ${x.tenure || '?'} instalments`)) : a.category === 'epf' ? undefined : a.category === 'vehicle' ? a.vehicleType : a.category === 'commodity' ? a.commodityType : mixed ? ASSET_LABELS[a.category as keyof typeof ASSET_LABELS] ?? a.category : undefined
    const tone = x.interest != null && x.interest > 0 ? 'text-success' : x.interest != null && x.interest < 0 ? 'text-destructive' : 'text-foreground'
    return (
      <li key={a.id}>
        <Link href={x.href ?? `/dashboard/mutual-funds/asset/${a.id}`} aria-label={`${a.name}, open details`} className="flex min-h-[4.25rem] w-full items-center gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-sm font-semibold leading-snug">{shortName(a.name)}</span>
            {sub && <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>}
          </span>
          <span className="flex h-10 w-28 shrink-0 flex-col justify-center text-right">
            {dMetric === 'value' && <><span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', tone)}><Money value={x.value} /></span><span className="block whitespace-nowrap text-xs tabular-nums text-muted-foreground">{x.invested != null ? <>(<Money value={x.invested} />)</> : '-'}</span></>}
            {dMetric === 'returns' && <><span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', tone)}>{pct != null ? `${pct > 0 ? '+' : pct < 0 ? '-' : ''}${Math.abs(pct).toFixed(2)}%` : '-'}</span><span className={cn('block whitespace-nowrap text-xs tabular-nums', tone)}>{x.interest == null ? '-' : <>{x.interest > 0 ? '+' : x.interest < 0 ? '-' : ''}{formatINR(Math.abs(x.interest))}</>}</span></>}
            {dMetric === 'split' && (() => { const e = epfShares(a); return <><span className="block whitespace-nowrap text-sm font-semibold tabular-nums"><span className="text-xs font-normal text-muted-foreground">EPF </span><Money value={e.employee + e.employer} /></span><span className="block whitespace-nowrap text-xs tabular-nums text-muted-foreground">EPS <Money value={e.eps} /></span></> })()}
            {dMetric === 'rate' && <><span className="block whitespace-nowrap text-sm font-semibold tabular-nums">{a.ratePct ? `${a.ratePct}%` : '-'}</span><span className="block text-xs text-muted-foreground">a year</span></>}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </li>
    )
  }


  return (
    <div className="flex flex-col gap-5">
      {kind !== 'epf' && (embedded ? <Button className="w-full sm:w-auto" onClick={() => setForm({})}>Add {SINGULAR[kind]}</Button> : <div className="absolute"><PageHeader primaryAction={{ label: `Add ${SINGULAR[kind]}`, onClick: () => setForm({}) }} /></div>)}
      {items.length > 0 && (() => {
        const t = returnTotals(items.map((x) => { const g = assetGain(x, today); return { value: assetValue(x, today), gain: g ? g.gain : null } }))
        // a holding with no cost recorded has no return to show, so those rows only appear when there is something to say
        const epf = kind === 'epf' ? items.reduce((n, a) => { const e = epfShares(a); return { epf: n.epf + e.employee + e.employer, eps: n.eps + e.eps, interest: n.interest + (Number(a.interestEarned) || 0) } }, { epf: 0, eps: 0, interest: 0 }) : null
        const rows: { label: string; value: ReactNode }[] = epf
          ? [{ label: 'EPF balance', value: <Money value={epf.epf} /> }, { label: 'EPS balance', value: <Money value={epf.eps} /> }, ...(epf.interest > 0 ? [{ label: 'Interest earned', value: <span className="text-success">+<Money value={epf.interest} /></span> }] : [])]
          : deposits
          ? [{ label: 'Invested value', value: <Money value={deposits.invested} /> }, { label: 'Interest earned', value: <span className="text-success">+<Money value={deposits.interest} /></span> }, ...(deposits.avgRate != null ? [{ label: 'Average rate', value: `${deposits.avgRate}%` }] : [])]
          : [...(t.gain != null ? [{ label: 'Invested value', value: <Money value={t.value - t.gain} /> }, { label: 'Total returns', value: <Metric arrow={false} amount={t.gain} pct={t.pct} compact={false} className="text-sm font-semibold" /> }] : [])]
        return (
          <section aria-label={`${group.label} overview`} className="surface-card px-4">
            <p className="pt-4 text-sm text-muted-foreground">Current value</p>
            <p className="text-3xl font-bold tabular-nums"><Money value={deposits ? deposits.value : t.value} /></p>
            <dl className={cn('text-sm', rows.length ? 'space-y-2.5 py-4' : 'pb-4')}>
              {rows.map((r) => <div key={r.label} className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{r.label}</dt><dd className="font-semibold tabular-nums">{r.value}</dd></div>)}
            </dl>
          </section>
        )
      })()}
      {kind === 'epf' && (
        <section aria-label="Import your EPFO passbook" className="surface-card space-y-3 p-4">
          <div>
            <h3 className="text-sm font-semibold">Keep EPF up to date from your passbook</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">EPF and EPS can only come from EPFO, so the figures always match what EPFO shows.</p>
          </div>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-3"><span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">1</span><span>Download the passbook PDF for each employer from the <a href="https://passbook.epfindia.gov.in" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">EPFO member passbook portal</a> (log in with your UAN).</span></li>
            <li className="flex gap-3"><span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">2</span><span>Import it here. If the PDF is password-protected you are asked for the password, which stays in this tab and is not stored. You review the figures before anything is saved.</span></li>
            <li className="flex gap-3"><span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">3</span><span>Import again any time. The saved figures for that employer are replaced, not added to.</span></li>
          </ol>
          <PdfStatementImport label="Import EPFO passbook" />
        </section>
      )}
      {items.length === 0 ? (
        <Empty title={`Nothing added under ${group.label} yet`} description={kind === 'epf' ? 'Import your EPFO passbook to see your EPF and EPS by employer.' : `Add a ${SINGULAR[kind]} to see its details and what it has earned.`} action={kind === 'epf' ? undefined : <Button onClick={() => setForm({})}>Add {SINGULAR[kind]}</Button>} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setDPanel(true)} aria-haspopup="dialog" aria-label={'Sort. Sorted by ' + D_SORT[dSort]} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {dSort !== sortOpts[0] && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
            </button>
            <button type="button" onClick={() => setDMetric(metricOpts[(metricOpts.indexOf(dMetric) + 1) % metricOpts.length])} aria-live="polite" aria-label={'Showing ' + D_METRIC[dMetric] + '. Tap to show the next figures'} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="border-b border-dashed border-muted-foreground">{D_METRIC[dMetric]}</span>
            </button>
          </div>
          <Sheet open={dPanel} onOpenChange={setDPanel}>
            <SheetContent side="bottom" className="rounded-t-2xl pb-8">
              <SheetHeader className="text-left"><SheetTitle>Sort by</SheetTitle><SheetDescription className="sr-only">Choose how the holdings are ordered</SheetDescription></SheetHeader>
              <div role="radiogroup" aria-label="Sort by" className="mt-4 flex flex-wrap gap-2">
                {sortOpts.map((k) => <button key={k} type="button" role="radio" aria-checked={dSort === k} onClick={() => { setDSort(k); setDPanel(false) }} className={cn('min-h-10 rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', dSort === k ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{D_SORT[k]}</button>)}
              </div>
            </SheetContent>
          </Sheet>
          {deposits ? (
            <>
              <HoldingList title={'Running (' + deposits.running.length + ')'}>{deposits.running.length ? dOrder(deposits.running).map(depositRow) : null}</HoldingList>
              {deposits.matured.length > 0 && <HoldingList title={'Matured (' + deposits.matured.length + ')'}>{dOrder(deposits.matured).map(depositRow)}</HoldingList>}
            </>
          ) : (
            kind === 'gold' ? (
              <HoldingList>{dOrder([...new Set(items.map(commodityType))].map((t) => {
                const lots = items.filter((a) => commodityType(a) === t).map(entry)
                const costed = lots.every((l) => l.invested != null)
                return { a: { id: t, name: t, category: 'commodity' }, value: lots.reduce((n, l) => n + l.value, 0), invested: costed ? lots.reduce((n, l) => n + l.invested, 0) : null, interest: costed ? lots.reduce((n, l) => n + l.interest, 0) : null, href: '/dashboard/mutual-funds/commodity/' + commoditySlug(t), count: lots.length }
              })).map(depositRow)}</HoldingList>
            ) : group.cats.map((cat) => {
              const list = items.filter((a) => a.category === cat).map(entry)
              return list.length ? <HoldingList key={cat} title={mixed ? (ASSET_LABELS[cat as keyof typeof ASSET_LABELS] ?? cat) + ' (' + list.length + ')' : undefined}>{dOrder(list).map(depositRow)}</HoldingList> : null
            })
          )}
        </>
      )}
      {form && <AssetForm row={form.row} category={group.cats[0]} categories={group.cats} onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success('Saved') }} />}
    </div>
  )
}
