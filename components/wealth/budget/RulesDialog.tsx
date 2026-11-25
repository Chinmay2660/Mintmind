'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Trash2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { applyRuleChanges, saveRules } from '@/lib/wealth/actions'
import { previewRules } from '@/lib/wealth/rules'
import { uid } from '@/lib/wealth/db'
import { useCategories } from '@/lib/wealth/useCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/pickers'

export interface CategoryRule { id: string; contains: string; category: string; kind?: 'expense' | 'income'; enabled?: boolean }

/** The rules, read from the person's data. Order is priority: the first rule that matches wins. */
export function useRules(): CategoryRule[] {
  const { data } = useWealth()
  return (data.meta.find((m: any) => m.key === 'categoryRulesList')?.value ?? []) as CategoryRule[]
}

/** Manage "if the description contains X, use category Y", and run the rules over past expenses. */
export function RulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { db, data } = useWealth()
  const cats = useCategories()
  const rules = useRules()
  const [text, setText] = useState('')
  const [cat, setCat] = useState('')
  const [onlyOther, setOnlyOther] = useState(true)
  const category = cat || cats.expense[0] || 'Other'

  const preview = useMemo(() => previewRules(rules, data.expenses, { onlyOther }), [rules, data.expenses, onlyOther])
  const save = (next: CategoryRule[]) => saveRules(db, next).catch(() => toast.error('Could not save the rules'))
  const add = () => {
    const t = text.trim()
    if (!t) return toast.warning('Type the words the description should contain')
    save([...rules, { id: uid('rl'), contains: t, category, kind: 'expense' }])
    setText('')
    toast.success('Rule added')
  }
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= rules.length) return; const n = [...rules]; [n[i], n[j]] = [n[j], n[i]]; save(n) }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Rules</DialogTitle>
          <DialogDescription>When a description contains your words, the category is filled in for you. The first rule in the list that matches wins, so put the most specific ones first.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-2 sm:grid-cols-[1fr_11rem_auto]" onSubmit={(e) => { e.preventDefault(); add() }}>
          <label className="text-xs text-muted-foreground">Description contains<Input aria-label="Description contains" className="mt-0.5 h-10" placeholder="e.g. swiggy" value={text} onChange={(e) => setText(e.target.value)} maxLength={60} /></label>
          <label className="text-xs text-muted-foreground">Use category<div className="mt-0.5"><Select aria-label="Category for this rule" value={category} onChange={(e) => setCat(e.target.value)}>{cats.expense.map((c: string) => <option key={c}>{c}</option>)}</Select></div></label>
          <Button type="submit" className="self-end">Add rule</Button>
        </form>

        {rules.length === 0 ? <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No rules yet. Add one above, for example &ldquo;swiggy&rdquo; to Food.</p> : (
          <ol className="divide-y divide-border rounded-xl border border-border">
            {rules.map((r, i) => (
              <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">contains <strong>{r.contains}</strong> <span className="text-muted-foreground">then</span> <strong>{r.category}</strong></span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move rule ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move rule ${i + 1} down`} disabled={i === rules.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete rule ${r.contains}`} onClick={() => save(rules.filter((x) => x.id !== r.id))}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ol>
        )}

        {rules.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
            <label className="flex items-center gap-2.5 text-sm"><Checkbox checked={onlyOther} onChange={(e) => setOnlyOther(e.target.checked)} aria-label="Only change expenses still in Other" />Only change expenses still in &ldquo;Other&rdquo;</label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">{preview.length === 0 ? 'Nothing in your past expenses would change.' : `${preview.length} past expense${preview.length === 1 ? '' : 's'} would change category.`}</p>
              <Button type="button" variant="outline" size="sm" disabled={!preview.length} onClick={async () => { const n = await applyRuleChanges(db, preview); toast.success(`Updated ${n} expense${n === 1 ? '' : 's'}`) }}><Wand2 className="mr-1.5 h-4 w-4" />Apply to past expenses</Button>
            </div>
            <p className="text-xs text-muted-foreground">Only the category label changes. Amounts, dates and balances stay as they are.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
