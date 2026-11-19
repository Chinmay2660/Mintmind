'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { Award } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { goalProgress } from '@/lib/wealth/goals'
import { achievements } from '@/lib/wealth/achievements'
import { Panel } from './kit'

/** Habits you have built, from your own records. Hidden when switched off in Settings, Preferences. */
export function AchievementsPanel() {
  const { data, netWorth } = useWealth()
  // drawn only in the browser: it depends on data kept on this device, so the server has nothing to match it with
  const inBrowser = useSyncExternalStore(() => () => {}, () => true, () => false)
  const on = (data.meta.find((m: any) => m.key === 'prefs')?.value?.achievements ?? true) !== false
  const list = useMemo(() => {
    const today = new Date()
    const goalsAchieved = (data.goals as any[]).filter((g) => goalProgress(g, data, today).achieved).length
    return achievements({ expenses: data.expenses as any[], bankTxns: data.bankTxns as any[], budgets: data.budgets as any[], snapshots: data.snapshots as any[], goalsAchieved, liquid: netWorth.assetBreakdown.bank || 0, today })
  }, [data, netWorth])
  if (!on || !inBrowser) return null

  const earned = list.filter((a) => a.earned.length > 0)
  const next = list.filter((a) => a.next).sort((a, b) => (b.next!.pct) - (a.next!.pct)).slice(0, 3)

  return (
    <Panel title="Your habits" description="Streaks and milestones worked out from your own records, nothing else. You can switch this off in Settings, Preferences.">
      {earned.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Earned">
          {earned.map((a) => { const top = a.earned[a.earned.length - 1]; return (
            <li key={a.id} className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-3 py-1.5 text-sm font-semibold">
              <Award className="h-4 w-4" aria-hidden /><span>{a.title}<span className="font-normal text-muted-foreground"> · {top} {a.unit}</span></span>
            </li>
          ) })}
        </ul>
      )}
      {next.length > 0 && (
        <div className={earned.length > 0 ? 'mt-4' : ''}>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Next up</h4>
          <ul className="space-y-3">
            {next.map((a) => (
              <li key={a.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium">{a.title}</span><span className="tabular-nums text-muted-foreground">{a.current} of {a.next!.tier} {a.unit}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full border border-border bg-muted" role="progressbar" aria-label={`${a.title}: ${a.current} of ${a.next!.tier}`} aria-valuemin={0} aria-valuemax={a.next!.tier} aria-valuenow={a.current}><div className="h-full bg-primary" style={{ width: `${Math.min(100, a.next!.pct)}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}
