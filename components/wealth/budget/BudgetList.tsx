'use client'

import { useMemo } from 'react'
import { Settings2 } from 'lucide-react'
import { budgetRows } from '@/lib/wealth/budgetRows'
import { formatINR } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Money } from '../Money'
import { Empty, Metric, Panel, Stat } from '../kit'
import { cn } from '@/lib/utils'
import { childOf } from '@/lib/wealth/subcategories'

interface Props { budget: any; prevBudget?: any; expenses: any[]; ym: string; today: Date; onEdit: () => void }

const BAR: Record<string, string> = { none: 'bg-muted-foreground/40', under: 'bg-primary', over: 'bg-warning', exceeded: 'bg-destructive' }
const CHIP: Record<string, string> = { none: 'border-border text-muted-foreground', under: 'border-primary/50 bg-primary/15 text-foreground', over: 'border-warning/60 bg-warning/15 text-foreground', exceeded: 'border-destructive/60 bg-destructive/15 text-destructive' }
const WORDS: Record<string, string> = { none: 'No limit', under: 'On track', over: 'Ahead of pace', exceeded: 'Over budget' }

/**
 * Every category with its limit, what is spent and how much could be spent by today if the limit were spread evenly.
 * The tick on each bar is "today's pace": spending to the left of it is on track, to the right is ahead.
 */
export function BudgetList({ budget, prevBudget, expenses, ym, today, onEdit }: Props) {
  const { rows: rawRows, total, days, dayToday } = useMemo(() => budgetRows({ budget, prevBudget, expenses, ym, today }), [budget, prevBudget, expenses, ym, today])
  const rows = rawRows as any[]
  if (!budget) return <Empty title="No budget for this month" description="Set a monthly budget and a limit for each category." action={<Button onClick={onEdit}>Set budget</Button>} />
  const now = dayToday > 0 && dayToday < days

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Budget" value={<Money value={total.limit} />} hint={`${days} days`} />
        <Stat label={now ? `Can spend till day ${dayToday}` : 'Allowed so far'} info="The monthly budget divided by the days in the month, times the days gone. Spend less than this and you are on pace." value={<Money value={total.allowedToDate} />} hint={total.canSpendNow > 0 ? `${formatINR(total.canSpendNow)} still free` : total.limit > 0 ? 'none left at this pace' : undefined} />
        <Stat label="Spent" value={<Money value={total.spent} />} hint={total.limit > 0 ? `${total.usedPct}% of budget` : undefined} />
        <Stat label="Spent vs last month" info="How this month's spending compares with the whole of the month before. Lower is better." value={<Metric amount={total.change} pct={total.changePct} invertGood className="text-lg font-semibold sm:text-xl" hint="No spending last month" />} hint={`Last month ${formatINR(total.prevSpent)}`} />
      </div>

      <Panel title="Categories" description="The marker shows how much you could have spent by today. Green is spending within that pace; orange or red is spending beyond it." action={<Button size="sm" variant="outline" onClick={onEdit}><Settings2 className="mr-1.5 h-4 w-4" />Edit budgets</Button>}>
        {rows.length === 0 ? <Empty title="No categories yet" description="Set a limit for each category, or record some expenses." /> : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const used = Math.min(100, r.usedPct ?? 0)
              const pace = Math.min(100, Math.max(0, r.pacePct ?? 0))
              const onPace = now ? Math.min(used, pace) : used
              const ahead = now ? Math.max(0, used - pace) : 0
              return (
                <li key={r.category} className="py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold">{r.category}{r.period && r.period !== 'monthly' && <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{r.period}</span>}</span>
                    {r.limit > 0
                      ? <span className={cn('shrink-0 text-sm font-bold tabular-nums', r.status === 'exceeded' ? 'text-destructive' : 'text-foreground')}>{r.status === 'exceeded' ? 'Over ' : ''}<Money value={Math.abs(r.remaining)} />{r.status === 'exceeded' ? '' : ' left'}</span>
                      : <span className="shrink-0 text-sm tabular-nums"><Money value={r.spent} /></span>}
                  </div>
                  {r.limit > 0 ? (
                    <>
                      <div style={{ position: 'relative', marginTop: 4, paddingTop: now ? 26 : 4, paddingBottom: now ? 6 : 0 }} role="img" aria-label={`${r.category}: ${r.usedPct} percent used. Pace for today is ${r.pacePct} percent, ${formatINR(r.allowedToDate)}. ${WORDS[r.status]}.`}>
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
                    <ul className="mt-2 space-y-1 border-l-2 border-border pl-3">
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
