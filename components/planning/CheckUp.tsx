'use client'

import { useState } from 'react'
import { moneyCheckup } from '@/lib/planning'
import { cn } from '@/lib/utils'

const TONE: Record<string, string> = { fix: 'bg-destructive/10 text-destructive', watch: 'bg-warning/15 text-warning', ok: 'bg-success/10 text-success', hold: 'bg-muted text-muted-foreground' }
const LABEL: Record<string, string> = { fix: 'Fix', watch: 'Watch', ok: 'OK', hold: 'On hold' }
const Pill = ({ s }: { s: string }) => <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', TONE[s])}>{LABEL[s]}</span>

export function CheckUp({ result }: { result: ReturnType<typeof moneyCheckup> }) {
  const [open, setOpen] = useState('safety')
  const g = result.groups.find((x) => x.id === open) ?? result.groups[0]
  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Your money check-up</h3>
        <div className="flex flex-wrap gap-2 text-xs">{(['fix', 'watch', 'hold', 'ok'] as const).map((s) => <span key={s} className="flex items-center gap-1"><Pill s={s} />{result.counts[s]}</span>)}</div></div>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul role="tablist" className="space-y-2">{result.groups.map((x) => (
          <li key={x.id}><button role="tab" aria-selected={x.id === g.id} onClick={() => setOpen(x.id)} className={cn('flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors', x.id === g.id ? 'border-primary bg-accent' : 'border-border hover:bg-muted')}><span className="text-sm font-medium">{x.name}</span><Pill s={x.status} /></button></li>))}</ul>
        <div className="rounded-xl border border-border p-4"><h4 className="font-semibold">{g.name}</h4><p className="text-sm text-muted-foreground">{g.question}</p>
          <ul className="mt-3 divide-y divide-border">{g.checks.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 py-2.5"><div><p className="text-sm font-medium">{c.label}</p><p className="text-xs text-muted-foreground">{c.detail}</p></div><Pill s={c.status} /></li>))}</ul></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Rules of thumb to start a conversation with yourself, not advice. Growth and retirement checks wait until the safety basics pass.</p>
    </div>
  )
}
