'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FormDialog, Panel, Progress } from '@/components/wealth/kit'
import { Money } from '@/components/wealth/Money'
import { useCategories } from '@/lib/wealth/useCategories'
import { incomeProgress } from '@/lib/wealth/incomeBudget'
import { cn } from '@/lib/utils'

export interface IncomePlan { total: number; categories: Record<string, number> }

/** Set what you expect to receive this month, in total and by income category. */
export function IncomeBudgetForm({ ym, plan, onClose, onSave }: { ym: string; plan: IncomePlan | null; onClose: () => void; onSave: (p: IncomePlan) => Promise<void> }) {
  const { income } = useCategories()
  const [total, setTotal] = useState(String(plan?.total ?? ''))
  const [cats, setCats] = useState<Record<string, string>>(Object.fromEntries(income.map((c) => [c, String(plan?.categories?.[c] ?? '')])))
  const sum = income.reduce((s, c) => s + (Number(cats[c]) || 0), 0)
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={plan ? 'Edit income budget' : 'Set income budget'} description={`What you expect to receive in ${ym}. Later months use it until you change it.`}
      onSubmit={async () => {
        const t = Number(total)
        if (!(t > 0)) throw new Error('Expected income must be more than zero')
        const categories: Record<string, number> = {}
        for (const c of income) if (Number(cats[c]) > 0) categories[c] = Number(cats[c])
        await onSave({ total: t, categories })
      }}>
      <Field label="Expected income per month (₹)" className="full">{(id) => <Input id={id} type="number" min="1" step="any" required value={total} onChange={(e) => setTotal(e.target.value)} />}</Field>
      <div className="full">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">By category</p>
        <ul className="space-y-2">
          {income.map((c) => (
            <li key={c} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
              <span className="min-w-0 truncate text-sm font-semibold">{c}</span>
              <div className="w-32 shrink-0"><Input aria-label={`${c} expected, in rupees`} type="number" min="0" step="any" inputMode="decimal" placeholder="Expected" value={cats[c]} onChange={(e) => setCats((p) => ({ ...p, [c]: e.target.value }))} /></div>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">Categories add up to ₹{sum.toLocaleString('en-IN')}</p>
      </div>
    </FormDialog>
  )
}

/** Expected against received, with a row for each income category. Shown on the Overview once an income budget exists. */
export function IncomeProgressPanel({ plan, bankTxns, ym, onEdit }: { plan: IncomePlan | null; bankTxns: any[]; ym: string; onEdit: () => void }) {
  if (!plan) return null
  const p = incomeProgress({ plan, bankTxns, ym })
  return (
    <Panel title="Income" description="What you expected against what has come in this month." action={<Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm"><strong className="text-lg font-semibold tabular-nums text-income"><Money value={p.received} /></strong> <span className="text-muted-foreground">of <Money value={p.expected} /> expected</span></p>
        {p.pct != null && <span className="text-sm font-semibold tabular-nums">{p.pct}%</span>}
      </div>
      <Progress value={Math.min(100, p.pct ?? 0)} tone="primary" label="Income received" />
      <ul className="mt-3 divide-y divide-border">
        {p.rows.map((r) => (
          <li key={r.category} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0 truncate">{r.category}</span>
            <span className={cn('shrink-0 tabular-nums', r.received > 0 ? 'text-income' : 'text-muted-foreground')}><Money value={r.received} compact />{r.expected > 0 && <span className="text-muted-foreground"> / <Money value={r.expected} compact /></span>}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
