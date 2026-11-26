'use client'
import { useState } from 'react'
import { useCategories } from '@/lib/wealth/useCategories'
import { formatINR } from '@/lib/wealth/format'
import { Input } from '@/components/ui/input'
import { Field, FormDialog, InfoTip } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { DateInput } from '@/components/ui/pickers'
import { Checkbox } from '@/components/ui/checkbox'

/** The full budget form: the month's total, each category's limit and its period (monthly, quarterly, yearly or a date range), and rollover. Opened from Settings > Budget. */
export function BudgetForm({ ym, row, onClose, onSave }: { ym: string; row?: any; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const { expense: EXPENSE_CATEGORIES } = useCategories()
  const [total, setTotal] = useState(String(row?.total ?? ''))
  const [cats, setCats] = useState<Record<string, string>>(Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, String(row?.categories?.[c] ?? '')])))
  const [rollover, setRollover] = useState(!!row?.rollover)
  const [periods, setPeriods] = useState<Record<string, string>>(row?.periods || {})
  const [ranges, setRanges] = useState<Record<string, { start: string; end: string }>>(row?.customRanges || {})
  const [rollCats, setRollCats] = useState<string[]>(row?.rolloverCats || [])
  const sum = EXPENSE_CATEGORIES.reduce((s, c) => s + (Number(cats[c]) || 0), 0)
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Budget for ${ym}`} wide
      onSubmit={async () => { const t = Number(total); if (!(t > 0)) throw new Error('Monthly budget must be positive'); await onSave({ id: ym, total: t, categories: Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, Number(cats[c]) || 0])), rollover, rolloverCats: rollCats.filter((c) => Number(cats[c]) > 0), periods: Object.fromEntries(Object.entries(periods).filter(([c, p]) => p !== 'monthly' && Number(cats[c]) > 0)), customRanges: Object.fromEntries(Object.entries(ranges).filter(([c, r]) => periods[c] === 'custom' && r.start && r.end && r.end >= r.start)) }) }}>
      <Field label="Monthly budget (₹)" className="full">{(id) => <Input id={id} type="number" min="1" step="any" required value={total} onChange={(e) => setTotal(e.target.value)} />}</Field>
      <div className="full">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-muted-foreground">
          <span className="flex-1">Category limits</span>
          <InfoTip label="About budget periods">Choose how long each limit lasts. Monthly resets every month. Quarterly and Yearly are one limit for the whole quarter or year, and spending counts from its start. Custom is a date range of your own, such as a trip. Tick Roll over to carry what is unspent into next month (monthly limits).</InfoTip>
        </div>
        <ul className="space-y-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const per = periods[c] || 'monthly'
            const rng = ranges[c] || { start: '', end: '' }
            return (
              <li key={c} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold">{c}</span>
                  <div className="w-32 shrink-0"><Input aria-label={`${c} limit in rupees`} type="number" min="0" step="any" inputMode="decimal" placeholder="Limit" value={cats[c]} onChange={(e) => setCats((p) => ({ ...p, [c]: e.target.value }))} /></div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div role="radiogroup" aria-label={`${c} budget period`} className="inline-flex rounded-lg border border-border bg-muted p-0.5"
                    onKeyDown={(e) => { const order = ['monthly', 'quarterly', 'yearly', 'custom']; const i = order.indexOf(per); const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return; e.preventDefault(); const next = order[(i + d + order.length) % order.length]; setPeriods((p) => ({ ...p, [c]: next })); requestAnimationFrame(() => (e.currentTarget.querySelector(`[data-period="${next}"]`) as HTMLElement | null)?.focus()) }}>
                    {[['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['yearly', 'Yearly'], ['custom', 'Custom']].map(([v, l]) => (
                      <button key={v} type="button" role="radio" data-period={v} tabIndex={per === v ? 0 : -1} aria-checked={per === v} onClick={() => setPeriods((p) => ({ ...p, [c]: v }))} className={cn('rounded-md px-2.5 py-1 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring', per === v ? 'bg-primary text-primary-foreground shadow-card' : 'text-muted-foreground hover:text-foreground')}>{l}</button>
                    ))}
                  </div>
                  {per === 'monthly' && <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Checkbox checked={rollCats.includes(c)} disabled={!(Number(cats[c]) > 0)} onChange={(e) => setRollCats((p) => (e.target.checked ? [...p, c] : p.filter((x) => x !== c)))} aria-label={`Roll over unspent ${c} budget`} />Roll over</label>}
                </div>
                {per === 'custom' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">From<DateInput aria-label={`${c} starts`} value={rng.start} onChange={(e) => setRanges((p) => ({ ...p, [c]: { ...rng, start: e.target.value } }))} /></label>
                    <label className="text-xs text-muted-foreground">To<DateInput aria-label={`${c} ends`} value={rng.end} onChange={(e) => setRanges((p) => ({ ...p, [c]: { ...rng, end: e.target.value } }))} /></label>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">Limits add up to {formatINR(sum)}{Number(total) ? ` · ${formatINR(Number(total) - sum)} unallocated` : ''}</p>
      </div>
      <label className="full flex items-center gap-2 text-sm"><Checkbox checked={rollover} onChange={(e) => setRollover(e.target.checked)} />Roll over the unspent total budget<InfoTip label="About total rollover">Adds whatever was left of last month's total budget to this month's.</InfoTip></label>
    </FormDialog>
  )
}
