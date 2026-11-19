'use client'

import { useMemo, useState } from 'react'
import { Plus, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { toISO } from '@/lib/wealth/calc'
import { uid } from '@/lib/wealth/db'
import { formatDate } from '@/lib/wealth/format'
import { SUB_FREQUENCIES, monthlyCost, nextSubscriptionDate } from '@/lib/wealth/subscriptions'
import { useCategories } from '@/lib/wealth/useCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Money } from '../Money'
import { DateInput, Field, FormDialog, Panel, Select } from '../kit'

export interface Subscription { id: string; name: string; amount: number; frequency: string; startDate: string; category: string; note?: string }

export function useSubscriptions(): Subscription[] {
  const { data } = useWealth()
  return (data.meta.find((m: any) => m.key === 'subscriptions')?.value ?? []) as Subscription[]
}

/** Add or edit a subscription or any fixed payment. It reminds you when it is due; it does not move money. */
export function SubscriptionForm({ row, onClose }: { row?: Subscription | null; onClose: () => void }) {
  const { db } = useWealth()
  const list = useSubscriptions()
  const cats = useCategories()
  const [name, setName] = useState(row?.name ?? '')
  const [amount, setAmount] = useState(row ? String(row.amount) : '')
  const [frequency, setFrequency] = useState(row?.frequency ?? 'monthly')
  const [startDate, setStartDate] = useState(row?.startDate ?? toISO(new Date()))
  const [category, setCategory] = useState(row?.category ?? 'Bills')
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit recurring payment' : 'Add a recurring payment'} description="A subscription, rent, a premium or any fixed payment that repeats. You get its next due date. SIPs are added under Investments."
      onSubmit={async () => {
        const n = Number(amount)
        if (!name.trim()) throw new Error('Enter a name')
        if (!(n > 0)) throw new Error('Enter an amount greater than zero')
        if (!startDate) throw new Error('Choose the first payment date')
        const rec: Subscription = { id: row?.id ?? uid('sb'), name: name.trim().slice(0, 60), amount: n, frequency, startDate, category }
        await db.meta.put({ key: 'subscriptions', value: row ? list.map((s) => (s.id === row.id ? rec : s)) : [...list, rec] })
        toast.success('Saved')
      }}>
      <Field label="Name" className="full">{(id) => <Input id={id} required maxLength={60} placeholder="e.g. Netflix, rent" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" min="0" step="any" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
      <Field label="Repeats">{(id) => <Select id={id} value={frequency} onChange={(e) => setFrequency(e.target.value)}>{SUB_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</Select>}</Field>
      <Field label="First or next payment date">{(id) => <DateInput id={id} required value={startDate} onChange={(e) => setStartDate(e.target.value)} />}</Field>
      <Field label="Category">{(id) => <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)}>{cats.expense.map((c: string) => <option key={c}>{c}</option>)}</Select>}</Field>
    </FormDialog>
  )
}

/** The subscriptions you set up, with what they cost a month and when each is next due. */
export function SubscriptionsPanel() {
  const { db } = useWealth()
  const list = useSubscriptions()
  const [dlg, setDlg] = useState<null | { kind: 'form' | 'del'; row?: Subscription }>(null)
  const today = useMemo(() => new Date(), [])
  const rows = list.map((s) => ({ s, next: nextSubscriptionDate(s, today) })).sort((a, b) => (a.next ?? '9').localeCompare(b.next ?? '9'))
  const monthly = list.reduce((n, s) => n + monthlyCost(s), 0)
  return (
    <Panel title="Subscriptions and fixed payments" description="Ones you add yourself. They are reminders and a cost summary: nothing is paid or recorded as an expense until you record it."
      action={<Button size="sm" variant="outline" onClick={() => setDlg({ kind: 'form' })}><Plus className="mr-1 h-4 w-4" />Add</Button>}>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">None yet. Add Netflix, rent, a loan EMI or anything else that repeats.</p> : (
        <>
          <ul className="divide-y divide-border">
            {rows.map(({ s, next }) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary" aria-hidden><Repeat className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{s.name}</span><span className="block truncate text-xs text-muted-foreground">{s.category} · {SUB_FREQUENCIES.find((f) => f.value === s.frequency)?.label}{next ? ` · next ${formatDate(next)}` : ''}</span></span>
                <Money value={s.amount} className="text-sm font-semibold" />
                <Button size="sm" variant="outline" aria-label={`Edit ${s.name}`} onClick={() => setDlg({ kind: 'form', row: s })}>Edit</Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => setDlg({ kind: 'del', row: s })}>Delete</Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">About <Money value={Math.round(monthly)} /> a month in total.</p>
        </>
      )}
      {dlg?.kind === 'form' && <SubscriptionForm row={dlg.row} onClose={() => setDlg(null)} />}
      <ConfirmDialog open={dlg?.kind === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this payment?" description="Past expenses you recorded are kept." confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { await db.meta.put({ key: 'subscriptions', value: list.filter((x) => x.id !== dlg!.row!.id) }); setDlg(null); toast.success('Deleted') }} />
    </Panel>
  )
}
