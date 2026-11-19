'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { splitExpense, unsplitExpense } from '@/lib/wealth/actions'
import { checkSplits, expenseParts } from '@/lib/wealth/splits'
import { useCategories } from '@/lib/wealth/useCategories'
import { formatINR } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/pickers'

interface Row { id: number; category: string; amount: string }

/** Share one expense across categories, such as a shop bill that is partly groceries and partly household. The amount and the account stay as they are. */
export function SplitDialog({ expense, onClose }: { expense: any; onClose: () => void }) {
  const { db } = useWealth()
  const cats = useCategories()
  const total = Number(expense.amount) || 0
  const already = expenseParts(expense).length > 1
  const [rows, setRows] = useState<Row[]>(() => {
    const parts = expenseParts(expense)
    if (parts.length > 1) return parts.map((p, i) => ({ id: i, category: p.category, amount: String(p.amount) }))
    return [{ id: 0, category: expense.category, amount: String(total) }, { id: 1, category: cats.expense.find((c) => c !== expense.category) || 'Other', amount: '' }]
  })
  const check = useMemo(() => checkSplits(total, rows.map((r) => ({ category: r.category, amount: Number(r.amount) }))), [rows, total])
  const set = (id: number, patch: Partial<Row>) => setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const left = Math.round((total - rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)) * 100) / 100

  const save = async () => {
    if (!check.ok) return toast.error(check.error)
    await splitExpense(db, expense.id, check.splits)
    toast.success('Split saved')
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Split this expense</DialogTitle>
          <DialogDescription>{expense.note || expense.category} · {formatINR(total)}. Each part counts under its own category in your budget and reports.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2">
              <Select aria-label={`Category for part ${i + 1}`} value={r.category} onChange={(e) => set(r.id, { category: e.target.value })}>{cats.expense.map((c: string) => <option key={c}>{c}</option>)}</Select>
              <Input aria-label={`Amount for part ${i + 1}`} type="number" min="0" step="any" inputMode="decimal" placeholder="0" value={r.amount} onChange={(e) => set(r.id, { amount: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label={`Remove part ${i + 1}`} disabled={rows.length <= 2} onClick={() => setRows((p) => p.filter((x) => x.id !== r.id))}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-2 text-sm">
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((p) => [...p, { id: Math.max(...p.map((x) => x.id)) + 1, category: 'Other', amount: left > 0 ? String(left) : '' }])}><Plus className="mr-1 h-4 w-4" />Add a part</Button>
          <span role="status" className={left === 0 ? 'text-muted-foreground' : 'font-semibold text-destructive'}>{left === 0 ? 'Fully assigned' : left > 0 ? `${formatINR(left)} left to assign` : `${formatINR(-left)} too much`}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          {already ? <Button type="button" variant="ghost" onClick={async () => { await unsplitExpense(db, expense.id); toast.success('Back to one category'); onClose() }}>Remove split</Button> : <span />}
          <span className="flex gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="button" onClick={save} disabled={!check.ok}>Save split</Button></span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
