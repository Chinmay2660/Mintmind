'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { budgetRows } from '@/lib/wealth/budgetRows'
import { formatINR } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Money } from '../Money'
import { Empty, Metric, Panel, Stat } from '../kit'
import { cn } from '@/lib/utils'
import { childOf } from '@/lib/wealth/subcategories'

interface Props { budget: any; prevBudget?: any; expenses: any[]; ym: string; today: Date; onOpenCategory?: (category: string) => void }

const BAR: Record<string, string> = { none: 'bg-muted-foreground/40', under: 'bg-primary', over: 'bg-warning', exceeded: 'bg-destructive' }
const CHIP: Record<string, string> = { none: 'border-border text-muted-foreground', under: 'border-primary/50 bg-primary/15 text-foreground', over: 'border-warning/60 bg-warning/15 text-foreground', exceeded: 'border-destructive/60 bg-destructive/15 text-destructive' }
const WORDS: Record<string, string> = { none: 'No limit', under: 'On track', over: 'Ahead of pace', exceeded: 'Over budget' }

/**
 * Every category with its limit, what is spent and how much could be spent by today if the limit were spread evenly.
 * The tick on each bar is "today's pace": spending to the left of it is on track, to the right is ahead.
 */
export function BudgetList({ budget, prevBudget, expenses, ym, today, onOpenCategory }: Props) {
  const { rows: rawRows, total, days, dayToday } = useMemo(() => budgetRows({ budget, prevBudget, expenses, ym, today }), [budget, prevBudget, expenses, ym, today])
  const rows = rawRows as any[]
  const [openKids, setOpenKids] = useState<Set<string>>(new Set()) // parents whose sub-categories are showing
  if (!budget) return <Empty title="No budget for this month" description="Set a monthly budget and a limit for each category." action={<Button asChild><Link href="/dashboard/settings?tab=budget">Set budget in Settings</Link></Button>} />
  const now = dayToday > 0 && dayToday < days

  return (
    <div className="space-y-4">
      {/* one summary instead of four boxes: what is free now leads, then the month on one bar, then three small facts */}
      {(() => {
        const limit = total.limit
        const left = limit - total.spent
        const used = limit > 0 ? Math.min(100, Math.round((total.spent / limit) * 100)) : 0
        const pace = limit > 0 && now ? Math.min(100, Math.round((total.allowedToDate / limit) * 100)) : null
        const daysLeft = Math.max(1, days - dayToday)
        const headline = limit <= 0 ? { label: 'Spent this month', value: total.spent, tone: '' }
          : now ? { label: 'Free to spend now', value: total.canSpendNow, tone: total.canSpendNow > 0 ? 'text-success' : 'text-destructive' }
          : { label: left >= 0 ? 'Left this month' : 'Over budget by', value: Math.abs(left), tone: left >= 0 ? 'text-success' : 'text-destructive' }
        const sub = limit <= 0 ? 'No monthly budget set'
          : now ? `${formatINR(total.allowedToDate)} allowed till day ${dayToday}${total.canSpendNow > 0 ? '' : '. None left at this pace'}`
          : `${days} days`
        return (
          <section className="surface-card p-4 sm:p-5" aria-label="Budget summary">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{headline.label}</p>
                <p className={cn('mt-1 text-3xl font-semibold tracking-tight tabular-nums', headline.tone)}><Money value={headline.value} /></p>
                <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
              </div>
              {now && limit > 0 && left > 0 && (
                <p className="shrink-0 text-right text-xs text-muted-foreground"><span className="block text-sm font-semibold tabular-nums text-foreground"><Money value={Math.round(left / daysLeft)} /></span>a day for<br />{daysLeft} days</p>
              )}
            </div>
            {limit > 0 && (
              <div className="mt-4">
                <div className="relative h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
                  <div className={cn('h-full rounded-full', used >= 90 ? 'bg-destructive' : used >= 70 ? 'bg-warning' : 'bg-primary')} style={{ width: `${used}%` }} />
                  {pace != null && <span aria-hidden className="absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `${pace}%` }} />}
                </div>
                {pace != null && <p className="mt-1 text-[11px] text-muted-foreground">The line is today's pace.</p>}
              </div>
            )}
            <dl className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3 text-center">
              <div className="px-2"><dt className="text-[11px] text-muted-foreground">Budget</dt><dd className="mt-0.5 text-sm font-semibold tabular-nums"><Money value={limit} compact /></dd></div>
              <div className="px-2"><dt className="text-[11px] text-muted-foreground">Spent{limit > 0 ? ` · ${total.usedPct}%` : ''}</dt><dd className="mt-0.5 text-sm font-semibold tabular-nums"><Money value={total.spent} compact /></dd></div>
              <div className="px-2"><dt className="text-[11px] text-muted-foreground">vs last month</dt><dd className="mt-0.5 text-sm font-semibold tabular-nums"><Metric amount={total.changePct == null ? total.change : undefined} pct={total.changePct ?? undefined} invertGood hint="None last month" className="text-sm" /></dd></div>
            </dl>
          </section>
        )
      })()}

      <Panel title="Categories" description="The marker shows how much you could have spent by today. Green is spending within that pace; orange or red is spending beyond it.">
        {rows.length === 0 ? <Empty title="No categories yet" description="Set a limit for each category, or record some expenses." /> : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const used = Math.min(100, r.usedPct ?? 0)
              const pace = Math.min(100, Math.max(0, r.pacePct ?? 0))
              const onPace = now ? Math.min(used, pace) : used
              const ahead = now ? Math.max(0, used - pace) : 0
              return (
                <li key={r.category} className="py-3.5">
                  <button type="button" onClick={() => onOpenCategory?.(r.category)} aria-label={`${r.category}, show expenses`} className="flex w-full items-baseline justify-between gap-3 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="min-w-0 truncate text-sm font-semibold">{r.category}{r.period && r.period !== 'monthly' && <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{r.period}</span>}</span>
                    {r.limit > 0
                      ? <span className={cn('shrink-0 text-sm font-bold tabular-nums', r.status === 'exceeded' ? 'text-destructive' : 'text-foreground')}>{r.status === 'exceeded' ? 'Over ' : ''}<Money value={Math.abs(r.remaining)} />{r.status === 'exceeded' ? '' : ' left'}</span>
                      : <span className="shrink-0 text-sm tabular-nums"><Money value={r.spent} /></span>}
                  </button>
                  {r.limit > 0 ? (
                    <>
                      <div style={{ position: 'relative', marginTop: 4, paddingTop: now ? 26 : 4, paddingBottom: now ? 6 : 0 }}>
                        <div style={{ position: 'relative', height: 12, borderRadius: 9999, overflow: 'hidden' }} className="border border-border bg-muted">
                          <div className={cn('h-full', BAR[r.status])} style={{ width: `${used}%` }} />
                        </div>
                        {now && (
                          <>
                            <span aria-hidden style={{ position: 'absolute', top: 0, left: `${pace}%`, transform: 'translateX(-50%)', zIndex: 3, fontSize: 10, fontWeight: 700, lineHeight: '12px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }} className="text-foreground">Today</span>
                            <svg aria-hidden width="12" height="8" viewBox="0 0 12 8" style={{ position: 'absolute', top: 13, left: `${pace}%`, marginLeft: -6, zIndex: 3 }}><path d="M1 1h10L6 7z" fill="hsl(var(--foreground))" stroke="hsl(var(--background))" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                            <span aria-hidden style={{ position: 'absolute', top: 20, bottom: 0, left: `${pace}%`, width: 3, marginLeft: -1.5, borderRadius: 2, zIndex: 3, background: 'hsl(var(--foreground))', boxShadow: '0 0 0 1px hsl(var(--background))' }} />
                          </>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                        <span><strong className="font-semibold text-foreground"><Money value={r.spent} /></strong> of {formatINR(r.limit)}{now ? <> · <span className="text-foreground">▼ today {formatINR(r.allowedToDate)}</span></> : ''}</span>
                        <span className="flex items-center gap-2">{now && r.status !== 'exceeded' && <span className={r.status === 'over' ? 'font-semibold text-warning' : ''}>{r.status === 'over' ? `${formatINR(r.spent - r.allowedToDate)} ahead` : `${formatINR(r.canSpendNow)} free`}</span>}<Metric amount={r.change} pct={r.changePct} invertGood hint="Nothing last month" className="text-xs" /><span className="text-muted-foreground">vs last month</span></span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>No limit set</span><Metric amount={r.change} pct={r.changePct} invertGood hint="Nothing last month" className="text-xs" /></p>
                  )}
                  {r.children?.length > 0 && (
                    <button type="button" aria-expanded={openKids.has(r.category)} onClick={() => setOpenKids((o) => { const n = new Set(o); n.has(r.category) ? n.delete(r.category) : n.add(r.category); return n })} className="mt-2 inline-flex min-h-8 items-center gap-1 rounded text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openKids.has(r.category) && 'rotate-180')} aria-hidden />{r.children.length} sub-categor{r.children.length === 1 ? 'y' : 'ies'}</button>
                  )}
                  {r.children?.length > 0 && openKids.has(r.category) && (
                    <ul className="mt-1 space-y-1 border-l-2 border-border pl-3">
                      {r.children.map((k: any) => (
                        <li key={k.category} className="flex items-center justify-between gap-3 text-xs">
                          <span className="min-w-0 truncate">{childOf(k.category)}</span>
                          <span className="flex shrink-0 items-center gap-2 tabular-nums"><span className={cn(k.status === 'exceeded' && 'font-semibold text-destructive', k.status === 'over' && 'text-warning')}><Money value={k.spent} />{k.limit > 0 ? ` / ${formatINR(k.limit)}` : ''}</span><Metric amount={k.change} pct={k.changePct} invertGood hint="Nothing last month" className="text-xs" /></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

    </div>
  )
}
