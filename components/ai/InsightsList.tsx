'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAi } from './useAi'

const dot = { high: 'bg-destructive', medium: 'bg-warning', low: 'bg-muted-foreground' } as const
const KIND: Record<string, string> = { fact: 'Fact', estimate: 'Estimate', suggestion: 'Suggestion' }

/** Insights with their data period and type (fact / estimate / suggestion). Dismissed insights stay hidden for that period. */
export function InsightsList({ limit, showRestore = true }: { limit?: number; showRestore?: boolean }) {
  const { insights, dismiss, dismissedCount, restore, isDemo } = useAi()
  const list = limit ? insights.slice(0, limit) : insights
  return (
    <div className="space-y-2">
      {list.length === 0 ? <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No new insights right now.</p> : (
        <ul className="space-y-2">
          {list.map((i) => (
            <li key={i.id} className="group flex items-start gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dot[i.severity as keyof typeof dot])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{i.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{i.module} · {KIND[i.kind]} · {i.period}{i.href && <> · <Link href={i.href} className="font-medium text-primary hover:underline">Open</Link></>}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Dismiss insight" onClick={() => dismiss(i.id)}><X className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{isDemo ? 'Demo: insights are generated from sample data by built-in rules.' : 'Generated from your data by built-in rules.'}</span>
        {showRestore && dismissedCount > 0 && <button type="button" className="rounded px-1 py-0.5 hover:bg-muted hover:text-foreground" onClick={() => restore()}>Restore {dismissedCount} dismissed</button>}
      </div>
    </div>
  )
}
