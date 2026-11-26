'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fundMetrics } from '@/lib/wealth/calc'
import { usePagination } from '@/lib/hooks/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Money } from '../Money'
import { Empty, InfoTip, Metric } from '../kit'

type Sort = 'value' | 'pct' | 'gain' | 'invested'
const SORT_LABEL: Record<Sort, string> = { value: 'Current value', pct: 'Returns (%)', gain: 'Absolute gain (₹)', invested: 'Invested amount' }

/** What the right-hand side of every row shows. The person picks one; it applies to all rows at once. */
type Metric = 'returns' | 'value' | 'day' | 'xirr'
const METRIC_LABEL: Record<Metric, { short: string; long: string }> = {
  returns: { short: 'Returns (%)', long: 'Returns (%) and total returns (₹)' },
  value: { short: 'Current (Invested)', long: 'Current value (₹) and invested (₹)' },
  day: { short: '1D change', long: '1-day change (₹) and (%)' },
  xirr: { short: 'XIRR (%)', long: 'XIRR (%)' },
}
const KEY_SORT = 'mm-mf-sort', KEY_METRIC = 'mm-mf-metric'
const remembered = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => { try { const v = localStorage.getItem(key); return allowed.includes(v as T) ? (v as T) : fallback } catch { return fallback } }

const signTone = (n: number) => (n > 0 ? 'text-success' : n < 0 ? 'text-destructive' : 'text-foreground')
const pctText = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(2)}%`

/** What one fund did today: the money and the percentage, from the previous NAV. Null when there is no previous NAV. */
const dayMove = (f: any) => (Number(f.prevNav) > 0 && Number(f.units) > 0 ? { amount: (f.currentNav - f.prevNav) * f.units, pct: (f.currentNav / f.prevNav - 1) * 100 } : null)

/**
 * The Holdings tab: how the portfolio is doing (XIRR first), then one row per fund. A row opens in place to show its figures and every
 * transaction behind it. Funds sort by return %, absolute gain, value or amount invested.
 */
export function HoldingsView({ summary, funds, txns, today, caption, onAdd }: { summary: any; funds: any[]; txns: any[]; today: Date; caption?: ReactNode; onAdd: () => void }) {
  const [sort, setSort] = useState<Sort>('value') // biggest holding first
  const [metric, setMetric] = useState<Metric>('returns') // returns % on the right to start with
  const [panel, setPanel] = useState(false) // the sort and filter choices, opened in place under the controls
  const [cat, setCat] = useState('')
  // what was chosen last time is kept, applied after the first paint so the server and browser agree
  useEffect(() => { setSort(remembered(KEY_SORT, ['value', 'pct', 'gain', 'invested'] as const, 'value')); setMetric(remembered(KEY_METRIC, ['returns', 'value', 'day', 'xirr'] as const, 'returns')) }, [])
  const remember = (key: string, v: string) => { try { localStorage.setItem(key, v) } catch { /* private window */ } }
  const pickSort = (v: Sort) => { setSort(v); remember(KEY_SORT, v); setPanel(false) }
  // one tap on the right-hand label moves every row to the next metric: returns, current and invested, today's change, XIRR
  const nextMetric = () => { const order = Object.keys(METRIC_LABEL) as Metric[]; const n = order[(order.indexOf(metric) + 1) % order.length]; setMetric(n); remember(KEY_METRIC, n) }
  const cats = useMemo(() => [...new Set<string>(funds.map((f) => f.category).filter(Boolean))], [funds])
  const rows = useMemo(() => {
    const key: Record<Sort, (m: ReturnType<typeof fundMetrics>) => number> = { pct: (m) => m.absReturnPct, gain: (m) => m.absReturn, value: (m) => m.value, invested: (m) => m.invested }
    // one row for each fund: its folios (a fund can be held in several) are added together, and the row opens the first of them
    const groups = new Map<string, any[]>()
    for (const f of funds.filter((x) => !cat || x.category === cat)) { const k = f.schemeCode ? `s:${f.schemeCode}` : `n:${String(f.name).trim().toLowerCase()}`; groups.set(k, [...(groups.get(k) ?? []), f]) }
    const merge = (list: any[]) => {
      if (list.length === 1) return { f: list[0], m: fundMetrics(list[0], txns, today) }
      const ids = new Set(list.map((x) => x.id)), sum = (k: string) => list.reduce((n, x) => n + (Number(x[k]) || 0), 0)
      const f = { ...list[0], units: sum('units'), invested: sum('invested'), currentValue: sum('currentValue') }
      return { f, m: fundMetrics(f, txns.filter((t) => ids.has(t.fundId)).map((t) => ({ ...t, fundId: f.id })), today) }
    }
    return [...groups.values()].map(merge).sort((a, b) => key[sort](b.m) - key[sort](a.m))
  }, [funds, txns, today, cat, sort])
  const pg = usePagination(rows, { pageSize: 10, resetKey: `${cat}|${sort}` })

  return (
    <div className="space-y-4">
      <section aria-label="Portfolio overview" className="surface-card px-4">
        {/* five figures, one size, in the order they are read: what it is worth, what went in, how it has done, today, and the yearly rate */}
        <dl className="divide-y divide-border text-sm">
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Current value</dt><dd className="font-semibold tabular-nums"><Money value={summary.value} /></dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Invested value</dt><dd className="font-semibold tabular-nums"><Money value={summary.invested} /></dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Total returns</dt><dd className="flex items-center gap-1.5 font-semibold tabular-nums"><Metric amount={summary.absReturn} compact={false} className="text-sm font-semibold" /><span>(<Metric pct={summary.absReturnPct} className="text-sm font-semibold" />)</span></dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">1D returns</dt><dd className="font-semibold tabular-nums"><Metric amount={summary.todayGain} compact={false} hint="Needs previous NAV" className="text-sm font-semibold" /></dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="flex items-center gap-1 text-muted-foreground">XIRR<InfoTip label="XIRR">Your annualised return, taking into account when each rupee went in. It describes the past and does not predict future returns. Needs at least two dated cashflows.</InfoTip></dt><dd className="font-semibold tabular-nums"><Metric pct={summary.xirrPct} digits={2} hint="Needs at least two dated cashflows" className="text-sm font-semibold" /></dd></div>
        </dl>
      </section>

      {funds.length === 0 ? <Empty title="No mutual funds yet" description="Search for a fund and add it with your units and cost." action={<Button onClick={onAdd}>Add fund</Button>} /> : (
        <section aria-label="Funds">
          {caption && <div className="text-xs text-muted-foreground">{caption}</div>}
          <div className="mt-2 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setPanel((v) => !v)} aria-expanded={panel} aria-controls="fund-sort-panel" aria-label={`Sort and filter funds. Sorted by ${SORT_LABEL[sort]}`} className={cn('relative flex h-10 w-10 items-center justify-center rounded-full border text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', panel ? 'border-primary bg-accent' : 'border-border')}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {(cat || sort !== 'value') && !panel && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
            </button>
            <button type="button" onClick={nextMetric} aria-live="polite" aria-label={`Showing ${METRIC_LABEL[metric].long}. Tap to show the next figures`} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="border-b border-dashed border-muted-foreground">{METRIC_LABEL[metric].short}</span>
            </button>
          </div>
          {panel && (
            <div id="fund-sort-panel" className="mt-2 space-y-3 rounded-xl bg-muted/40 p-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">Sort by</p>
                <div role="radiogroup" aria-label="Sort by" className="flex flex-wrap gap-1.5">
                  {(Object.keys(SORT_LABEL) as Sort[]).map((k) => <button key={k} type="button" role="radio" aria-checked={sort === k} onClick={() => pickSort(k)} className={cn('min-h-9 rounded-full border px-3.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', sort === k ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{SORT_LABEL[k]}</button>)}
                </div>
              </div>
              {cats.length > 1 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">Category</p>
                  <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
                    {['', ...cats].map((c) => <button key={c || 'all'} type="button" role="radio" aria-checked={cat === c} onClick={() => { setCat(c); setPanel(false) }} className={cn('min-h-9 rounded-full border px-3.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', cat === c ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{c || 'All categories'}</button>)}
                  </div>
                </div>
              )}
            </div>
          )}
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {pg.slice.map(({ f, m }: any) => {
              const day = dayMove(f)
              const tone = m.absReturn > 0 ? 'text-success' : m.absReturn < 0 ? 'text-destructive' : 'text-foreground'
              return (
                <li key={f.id}>
                  <Link href={`/dashboard/mutual-funds/${f.id}`} className="flex w-full items-start gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-semibold leading-snug">{f.name}</span></span>
                    <span className="min-w-[6.5rem] shrink-0 text-right">
                      {metric === 'returns' && <><span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', tone)}>{pctText(m.absReturnPct)}</span><span className={cn('block whitespace-nowrap text-xs tabular-nums', tone)}><Metric amount={m.absReturn} className="text-xs" /></span></>}
                      {metric === 'value' && <><span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', tone)}><Money value={m.value} /></span><span className="block whitespace-nowrap text-xs tabular-nums text-muted-foreground">(<Money value={m.invested} />)</span></>}
                      {metric === 'day' && (day ? <><span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', signTone(day.amount))}><Metric amount={day.amount} className="text-sm font-semibold" /></span><span className={cn('block whitespace-nowrap text-xs tabular-nums', signTone(day.amount))}>{pctText(day.pct)}</span></> : <span className="block text-sm text-muted-foreground">-</span>)}
                      {metric === 'xirr' && (m.xirrPct == null ? <span className="block text-sm text-muted-foreground">-</span> : <span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums', signTone(m.xirrPct))}>{pctText(m.xirrPct)}</span>)}
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} from={pg.from} to={pg.to} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} label="Fund list pages" />
        </section>
      )}
    </div>
  )
}

