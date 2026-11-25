'use client'

import { toastProblem } from '@/lib/notify'
import { useMemo, useState } from 'react'
import { CheckCheck, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { markReviewed, setCategory } from '@/lib/wealth/actions'
import { useCategories } from '@/lib/wealth/useCategories'
import { Select } from '@/components/ui/pickers'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDate } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Money } from '../Money'
import { Empty, Panel } from '../kit'
import type { Tx } from './Views'

/** Entries brought in from a file wait here until you have looked at them. Open one to fix its category, then mark it reviewed. */
export function ReviewView({ list, onEdit }: { list: Tx[]; onEdit: (t: Tx) => void }) {
  const { db } = useWealth()
  const items = list.filter((t) => (t.raw as any)?.needsReview)
  const cats = useCategories()
  const [picked, setPicked] = useState<string[]>([])
  const [cat, setCat] = useState('')
  const chosen = useMemo(() => items.filter((t) => picked.includes(t.key)), [items, picked])
  const kinds = new Set(chosen.map((t) => t.kind))
  const mixed = kinds.size > 1
  const options = kinds.has('income') ? cats.income : cats.expense
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  const done = async (these: Tx[]) => { const n = await markReviewed(db, these); setPicked([]); toast.success(`${n} marked as reviewed`) }
  const apply = async () => { try { const n = await setCategory(db, chosen, cat); toast.success(`${n} moved to ${cat}`); setCat('') } catch (e) { toastProblem(e, 'Could not change the category') } }
  return (
    <Panel title={`To review${items.length ? ` (${items.length})` : ''}`} description="Imported entries stay here until you mark them reviewed. Nothing about their amounts or balances changes."
      action={items.length > 1 ? <Button size="sm" variant="outline" onClick={() => done(items)}><CheckCheck className="mr-1.5 h-4 w-4" />Mark all reviewed</Button> : undefined}>
      {items.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-sm">
          <label className="flex items-center gap-2"><Checkbox checked={picked.length > 0 && chosen.length === Math.min(items.length, 50)} onChange={(e) => setPicked(e.target.checked ? items.slice(0, 50).map((t) => t.key) : [])} aria-label="Select all shown" />{chosen.length ? `${chosen.length} selected` : 'Select all shown'}</label>
          {chosen.length > 0 && (
            <>
              <div className="w-44"><Select aria-label="Category for the selected entries" value={cat} disabled={mixed} onChange={(e) => setCat(e.target.value)}><option value="">Set category…</option>{options.map((c: string) => <option key={c} value={c}>{c}</option>)}</Select></div>
              <Button size="sm" disabled={!cat || mixed} onClick={apply}>Apply</Button>
              <Button size="sm" variant="outline" onClick={() => done(chosen)}><Check className="mr-1 h-3.5 w-3.5" />Mark selected reviewed</Button>
              {mixed && <span className="text-xs text-muted-foreground">Select only expenses or only income to set a category.</span>}
            </>
          )}
        </div>
      )}
      {items.length === 0 ? <Empty title="All caught up" description="Entries you import from a CSV will show up here." /> : (
        <ul className="divide-y divide-border">
          {items.slice(0, 50).map((t) => (
            <li key={t.key} className="flex items-center gap-3 py-2.5">
              {items.length > 1 && <Checkbox checked={picked.includes(t.key)} onChange={() => toggle(t.key)} aria-label={`Select ${t.title}`} />}
              <button type="button" onClick={() => onEdit(t)} className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="block truncate text-sm font-medium">{t.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.category} · {formatDate(t.date)}</span>
              </button>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{t.kind === 'income' ? '+' : '-'}<Money value={t.amount} /></span>
              <Button size="sm" variant="outline" aria-label={`Mark ${t.title} reviewed`} onClick={() => done([t])}><Check className="mr-1 h-3.5 w-3.5" />Reviewed</Button>
            </li>
          ))}
        </ul>
      )}
      {items.length > 50 && <p className="mt-3 text-xs text-muted-foreground">Showing the first 50. Mark these and the next ones appear.</p>}
    </Panel>
  )
}
