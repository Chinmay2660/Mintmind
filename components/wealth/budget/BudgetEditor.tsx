'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatINR } from '@/lib/wealth/format'
import { cn } from '@/lib/utils'
import { childOf } from '@/lib/wealth/subcategories'

export interface EditorGroup { name: string; children: string[] }

const toNum = (s: string) => { const n = Number(s); return Number.isFinite(n) && n > 0 ? n : 0 }

/**
 * Set a budget the way a money manager app does: the month's total, then a limit beside every category, with its
 * sub-categories one tap below. Nothing about spending is shown here; that is on the Overview.
 * Used for the expense budget and for the income budget (which has no sub-categories).
 */
export function BudgetEditor({ groups, values, total, totalLabel, copyFrom, copyLabel, onSave, onMore }: {
  groups: EditorGroup[]
  values: Record<string, number>
  total: number
  totalLabel: string
  /** last month's limits, offered as a one-tap fill */
  copyFrom?: { total: number; values: Record<string, number> } | null
  copyLabel?: string
  onSave: (total: number, values: Record<string, number>) => Promise<void>
  /** the advanced options (periods, rollover), where there are any */
  onMore?: () => void
}) {
  const start = useMemo(() => Object.fromEntries(groups.flatMap((g) => [g.name, ...g.children]).map((c) => [c, values[c] ? String(values[c]) : ''])), [groups, values])
  const [vals, setVals] = useState<Record<string, string>>(start)
  const [tot, setTot] = useState(total ? String(total) : '')
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.filter((g) => g.children.some((c) => values[c] > 0)).map((g) => g.name)))
  const [busy, setBusy] = useState(false)

  const all = groups.flatMap((g) => [g.name, ...g.children])
  const sum = groups.reduce((s, g) => s + toNum(vals[g.name]) , 0)
  const dirty = tot !== (total ? String(total) : '') || all.some((c) => (vals[c] || '') !== (start[c] || ''))
  const setOne = (c: string, v: string) => setVals((p) => ({ ...p, [c]: v.replace(/[^0-9.]/g, '') }))

  const fillFromLast = () => {
    if (!copyFrom) return
    setVals(Object.fromEntries(all.map((c) => [c, copyFrom.values[c] ? String(copyFrom.values[c]) : ''])))
    setTot(copyFrom.total ? String(copyFrom.total) : '')
  }
  const save = async () => {
    const map: Record<string, number> = {}
    for (const c of all) if (toNum(vals[c]) > 0) map[c] = toNum(vals[c])
    setBusy(true)
    try { await onSave(toNum(tot), map) } finally { setBusy(false) }
  }

  const field = (c: string, label: string, small = false) => (
    <div className={cn('flex items-center justify-between gap-3', small ? 'py-1.5 pl-1 text-sm' : 'py-2.5')}>
      <span className={cn('min-w-0 truncate', small ? 'text-muted-foreground' : 'text-sm font-medium')}>{label}</span>
      <div className="relative w-32 shrink-0">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <Input aria-label={`${label} limit`} inputMode="decimal" placeholder="No limit" value={vals[c] ?? ''} onChange={(e) => setOne(c, e.target.value)} className={cn('pl-6 text-right tabular-nums', small && 'h-9')} />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
        <label htmlFor="budget-total" className="text-sm font-semibold">{totalLabel}</label>
        <div className="relative w-36 shrink-0">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
          <Input id="budget-total" inputMode="decimal" placeholder="0" value={tot} onChange={(e) => setTot(e.target.value.replace(/[^0-9.]/g, ''))} className="pl-6 text-right text-base font-semibold tabular-nums" />
        </div>
      </div>

      <ul className="divide-y divide-border">
        {groups.map((g) => {
          const isOpen = open.has(g.name)
          return (
            <li key={g.name}>
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">{field(g.name, g.name)}</div>
                {g.children.length > 0
                  ? <button type="button" aria-expanded={isOpen} aria-label={`${g.name}: ${isOpen ? 'hide' : 'show'} sub-categories`} onClick={() => setOpen((o) => { const n = new Set(o); n.has(g.name) ? n.delete(g.name) : n.add(g.name); return n })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} aria-hidden /></button>
                  : <span className="w-10 shrink-0" aria-hidden />}
              </div>
              {isOpen && g.children.length > 0 && (
                <div className="mb-2 ml-3 border-l border-border pl-3 pr-10">{g.children.map((c) => <div key={c}>{field(c, childOf(c) || c, true)}</div>)}</div>
              )}
            </li>
          )
        })}
      </ul>

      <p className="text-xs tabular-nums text-muted-foreground">Category limits add up to {formatINR(sum)}{toNum(tot) > 0 ? ` · ${formatINR(toNum(tot) - sum)} ${toNum(tot) - sum >= 0 ? 'not yet given to a category' : 'more than the total'}` : ''}</p>

      <div className="sticky bottom-[calc(var(--mobile-tab-bar-height,4.5rem)+0.75rem)] z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-2 backdrop-blur">
        <Button onClick={save} disabled={!dirty || busy} className="flex-1 sm:flex-none">{busy ? 'Saving…' : 'Save'}</Button>
        {copyFrom && <Button type="button" variant="outline" onClick={fillFromLast}>{copyLabel ?? 'Copy last month'}</Button>}
        {onMore && <Button type="button" variant="ghost" onClick={onMore}>Periods and rollover</Button>}
      </div>
    </div>
  )
}
