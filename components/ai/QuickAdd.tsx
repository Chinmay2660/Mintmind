'use client'

import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { parseExpenseText } from '@/lib/ai/quickAdd'
import { useCategories } from '@/lib/wealth/useCategories'
import { TxnEntryDialog } from '@/components/wealth/budget/TxnEntryDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatINR, formatDate } from '@/lib/wealth/format'
import { toISO } from '@/lib/wealth/calc'

const EXAMPLES = ['450 lunch with card yesterday', 'uber 1.2k cash', '2,500 groceries on 5 Jun', '300 petrol last monday']

/** Type an expense as a sentence. We read it, show what we understood, and you confirm in the normal entry form. */
export function QuickAdd() {
  const cats = useCategories()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const draft = useMemo(() => parseExpenseText(text, { categories: cats.expense }), [text, cats.expense])
  const ok = !!draft?.amount
  return (
    <div className="space-y-4">
      <div><h3 className="font-semibold">Quick add</h3><p className="text-sm text-muted-foreground">Write it the way you would say it. Nothing is saved until you confirm.</p></div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (ok) setOpen(true) }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 450 lunch with card yesterday" aria-label="Describe an expense" />
        <Button type="submit" disabled={!ok}><Sparkles className="mr-1.5 h-4 w-4" />Review</Button>
      </form>
      <div className="flex flex-wrap gap-2">{EXAMPLES.map((x) => <button key={x} type="button" onClick={() => setText(x)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{x}</button>)}</div>
      {draft && (
        <dl className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-4" aria-live="polite">
          {[['Amount', draft.amount ? formatINR(draft.amount) : 'Not found'], ['Category', draft.category], ['Paid via', draft.mode], ['Date', formatDate(draft.date)]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium capitalize">{v}</dd></div>)}
          {!draft.confident && draft.amount && <p className="text-xs text-warning sm:col-span-4">Category is a guess. You can change it on the next screen.</p>}
        </dl>
      )}
      {open && draft && <TxnEntryDialog draft={{ amount: draft.amount, date: draft.date, category: draft.category, mode: draft.mode, note: draft.note }} defaultMonth={toISO(new Date()).slice(0, 7)} onClose={() => { setOpen(false); setText('') }} />}
    </div>
  )
}
