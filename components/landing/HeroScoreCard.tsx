'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// Illustrative sample only: not anyone's real data. Switching scenarios shows how the same rules react.
const SCENARIOS = {
  Today: { score: 72, label: 'Watch', weakest: 'Borrow', bars: { Save: 79, 'Safety net': 100, Borrow: 44, Grow: 65, Protect: 79 } },
  'After a pay rise': { score: 78, label: 'Good', weakest: 'Borrow', bars: { Save: 88, 'Safety net': 100, Borrow: 52, Grow: 72, Protect: 79 } },
  'Prepay a loan': { score: 81, label: 'Good', weakest: 'Grow', bars: { Save: 79, 'Safety net': 90, Borrow: 78, Grow: 65, Protect: 79 } },
} as const

const tone = (n: number) => (n < 50 ? 'bg-destructive' : n < 70 ? 'bg-warning' : 'bg-primary')

export function HeroScoreCard() {
  const [k, setK] = useState<keyof typeof SCENARIOS>('Today')
  const s = SCENARIOS[k]
  return (
    <div className="surface-card w-full max-w-md p-5 shadow-elevated" aria-label="Sample financial health card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">How is your money today?</h2>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">Sample family</span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div><p className="text-xs text-muted-foreground">Your score</p><p className="text-5xl font-semibold tracking-tight">{s.score}<span className="ml-1 text-base font-normal text-muted-foreground">/100</span></p></div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', s.score >= 75 ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning')}>{s.label}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Weakest area: <strong className="text-foreground">{s.weakest}</strong></p>
      <ul className="mt-4 space-y-2.5">
        {Object.entries(s.bars).map(([name, v]) => (
          <li key={name} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-sm"><span className="text-muted-foreground">{name}</span><span className="h-2 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full rounded-full transition-all duration-300', tone(v))} style={{ width: `${v}%` }} /></span><span className="text-right tabular-nums">{v}</span></li>
        ))}
      </ul>
      <div role="tablist" aria-label="Sample scenarios" className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
        {(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]).map((x) => (
          <button key={x} role="tab" aria-selected={k === x} onClick={() => setK(x)} className={cn('rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', k === x ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{x}</button>
        ))}
      </div>
    </div>
  )
}
