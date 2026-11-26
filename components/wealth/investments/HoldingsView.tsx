'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fundMetrics } from '@/lib/wealth/calc'
import { usePagination } from '@/lib/hooks/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Money } from '../Money'
import { Empty, Metric } from '../kit'

type Sort = 'value' | 'pct' | 'gain' | 'invested'
const SORT_LABEL: Record<Sort, string> = { value: 'Current value', pct: 'Returns (%)', gain: 'Absolute gain (₹)', invested: 'Invested amount' }

/** What the right-hand side of every row shows. The person picks one; it applies to all rows at once. */
type Metric = 'value' | 'returns' | 'day'
const METRIC_LABEL: Record<Metric, { short: string; long: string }> = {
  value: { short: 'Current (Invested)', long: 'Current value (₹) and invested (₹)' },
  returns: { short: 'Returns (%)', long: 'Returns (%) and total returns (₹)' },
  day: { short: '1D change', long: '1-day change (₹) and (%)' },
}
const KEY_SORT = 'mm-mf-sort', KEY_METRIC = 'mm-mf-metric'
const remembered = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => { try { const v = localStorage.getItem(key); return allowed.includes(v as T) ? (v as T) : fallback } catch { return fallback } }

const signTone = (n: number) => (n > 0 ? 'text-success' : n < 0 ? 'text-destructive' : 'text-foreground')
const pctText = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(2)}%`

/** What one fund did today: the money and the percentage, from the previous NAV. Null when there is no previous NAV. */
const dayMove = (f: any) => (Number(f.prevNav) > 0 && Number(f.units) > 0 ? { amount: (f.currentNav - f.prevNav) * f.units, pct: (f.currentNav / f.prevNav - 1) * 100 } : null)

/**
 * The Holdings tab: how the portfolio is doing, then one row per fund. A row opens in place to show its figures and every
 * transaction behind it. Funds sort by return %, absolute gain, value or amount invested.
 */
export function HoldingsView({ summary, funds, txns, today, caption, onAdd }: { summary: any; funds: any[]; txns: any[]; today: Date; caption?: ReactNode; onAdd: () => void }) {
  const [sort, setSort] = useState<Sort>('value') // biggest holding first
  const [metric, setMetric] = useState<Metric>('value') // current value and what went in, on the right to start with
  const [panel, setPanel] = useState(false) // the sort and filter choices, opened in place under the controls
  // what was chosen last time is kept, applied after the first paint so the server and browser agree
  useEffect(() => { setSort(remembered(KEY_SORT, ['value', 'pct', 'gain', 'invested'] as const, 'value')); setMetric(remembered(KEY_METRIC, ['value', 'returns', 'day'] as const, 'value')) }, [])
  const remember = (key: string, v: string) => { try { localStorage.setItem(key, v) } catch { /* private window */ } }
  const pickSort = (v: Sort) => { setSort(v); remember(KEY_SORT, v); setPanel(false) }
  // one tap on the right-hand label moves every row to the next metric: current and invested, returns, today's change
  const nextMetric = () => { const order = Object.keys(METRIC_LABEL) as Metric[]; const n = order[(order.indexOf(metric) + 1) % order.length]; setMetric(n); remember(KEY_METRIC, n) }
  const rows = useMemo(() => {
    const key: Record<Sort, (m: ReturnType<typeof fundMetrics>) => number> = { pct: (m) => m.absReturnPct, gain: (m) => m.absReturn, value: (m) => m.value, invested: (m) => m.invested }
    // one row for each fund: its folios (a fund can be held in several) are added together, and the row opens the first of them
    const groups = new Map<string, any[]>()
    for (const f of funds) { const k = f.schemeCode ? `s:${f.schemeCode}` : `n:${String(f.name).trim().toLowerCase()}`; groups.set(k, [...(groups.get(k) ?? []), f]) }
    const merge = (list: any[]) => {
      if (list.length === 1) return { f: list[0], m: fundMetrics(list[0], txns, today) }
      const ids = new Set(list.map((x) => x.id)), sum = (k: string) => list.reduce((n, x) => n + (Number(x[k]) || 0), 0)
      const f = { ...list[0], units: sum('units'), invested: sum('invested'), currentValue: sum('currentValue') }
      return { f, m: fundMetrics(f, txns.filter((t) => ids.has(t.fundId)).map((t) => ({ ...t, fundId: f.id })), today) }
    }
    return [...groups.values()].map(merge).sort((a, b) => key[sort](b.m) - key[sort](a.m))
  }, [funds, txns, today, sort])
  const pg = usePagination(rows, { pageSize: 10, resetKey: sort })

  return (
    <div className="space-y-4">
      <section aria-label="Portfolio overview" className="surface-card px-4">
        {/* what it is worth leads; what went in and how it has done sit under it, with space rather than lines between them */}
        <p className="pt-4 text-sm text-muted-foreground">Current value</p>
        <p className="text-3xl font-bold tabular-nums"><Money value={summary.value} /></p>
        <dl className="space-y-2.5 py-4 text-sm">
          <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Invested value</dt><dd className="font-semibold tabular-nums"><Money value={summary.invested} /></dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Total returns</dt><dd className="flex items-center gap-1.5 font-semibold tabular-nums"><Metric arrow={false} amount={summary.absReturn} compact={false} className="text-sm font-semibold" /><span>(<Metric arrow={false} pct={summary.absReturnPct} className="text-sm font-semibold" />)</span></dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">1D returns</dt><dd className="flex items-center gap-1.5 font-semibold tabular-nums"><Metric arrow={false} amount={summary.todayGain} compact={false} hint="Needs previous NAV" className="text-sm font-semibold" />{summary.todayGain != null && summary.value - summary.todayGain > 0 && <span>(<Metric arrow={false} pct={(summary.todayGain / (summary.value - summary.todayGain)) * 100} digits={2} className="text-sm font-semibold" />)</span>}</dd></div>
        </dl>
      </section>

      {funds.length === 0 ? <Empty title="No mutual funds yet" description="Search for a fund and add it with your units and cost." action={<Button onClick={onAdd}>Add fund</Button>} /> : (
        <section aria-label="Funds">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setPanel((v) => !v)} aria-haspopup="dialog" aria-label={`Sort and filter funds. Sorted by ${SORT_LABEL[sort]}`} className={cn('relative flex h-10 w-10 items-center justify-center rounded-full border text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', panel ? 'border-primary bg-accent' : 'border-border')}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {sort !== 'value' && !panel && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
            </button>
            <button type="button" onClick={nextMetric} aria-live="polite" aria-label={`Showing ${METRIC_LABEL[metric].long}. Tap to show the next figures`} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="border-b border-dashed border-muted-foreground">{METRIC_LABEL[metric].short}</span>
            </button>
          </div>
          <Sheet open={panel} onOpenChange={setPanel}>
            <SheetContent side="bottom" className="rounded-t-2xl pb-8">
              <SheetHeader className="text-left"><SheetTitle>Sort by</SheetTitle><SheetDescription className="sr-only">Choose how the funds are ordered</SheetDescription></SheetHeader>
              <div role="radiogroup" aria-label="Sort by" className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(SORT_LABEL) as Sort[]).map((k) => <button key={k} type="button" role="radio" aria-checked={sort === k} onClick={() => pickSort(k)} className={cn('min-h-10 rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', sort === k ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{SORT_LABEL[k]}</button>)}
              </div>
            </SheetContent>
          </Sheet>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {pg.slice.map(({ f, m }: any) => {
              const day = dayMove(f)
              const tone = m.absReturn > 0 ? 'text-success' : m.absReturn < 0 ? 'text-destructive' : 'text-foreground'
              return (
                <li key={f.id}>
                  <Link href={`/dashboard/mutual-funds/${f.id}`} className="flex min-h-[4.25rem] w-full items-center gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-semibold leading-snug">{f.name}</span></span>
                    <span className="flex h-10 w-28 shrink-0 flex-col justify-center text-right">
                      {metric === 'returns' && <><span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', tone)}>{pctText(m.absReturnPct)}</span><span className={cn('block whitespace-nowrap text-xs tabular-nums', tone)}><Metric arrow={false} amount={m.absReturn} className="text-xs" /></span></>}
                      {metric === 'value' && <><span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', tone)}><Money value={m.value} /></span><span className="block whitespace-nowrap text-xs tabular-nums text-muted-foreground">(<Money value={m.invested} />)</span></>}
                      {metric === 'day' && (day ? <><span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', signTone(day.amount))}><Metric arrow={false} amount={day.amount} className="text-sm font-semibold" /></span><span className={cn('block whitespace-nowrap text-xs tabular-nums', signTone(day.amount))}>{pctText(day.pct)}</span></> : <span className="block text-sm text-muted-foreground">-</span>)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} from={pg.from} to={pg.to} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} label="Fund list pages" />
          {caption && <div className="mt-3 text-center text-xs text-muted-foreground">{caption}</div>}
        </section>
      )}
    </div>
  )
}

