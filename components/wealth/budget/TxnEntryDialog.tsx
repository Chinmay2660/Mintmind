'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addExpense, addIncome, addTransfer, updateExpense } from '@/lib/wealth/actions'
import { availableBalance, toISO } from '@/lib/wealth/calc'
import { PAYMENT_MODES } from '@/lib/wealth/labels'
import { useCategories } from '@/lib/wealth/useCategories'
import { formatINR } from '@/lib/wealth/format'
import { Input } from '@/components/ui/input'
import { findDuplicates, learnCorrection, suggestCategory } from '@/lib/ai/budgetAI'
import { Field, FormDialog, Select } from '../kit'
import { cn } from '@/lib/utils'

export type TxnType = 'expense' | 'income' | 'transfer'
const TYPES: { v: TxnType; l: string }[] = [{ v: 'expense', l: 'Expense' }, { v: 'income', l: 'Income' }, { v: 'transfer', l: 'Transfer' }]
const label = (a: any) => a.nickname || a.bankName
const cardLabel = (c: any) => `${c.bank} ${c.cardName}`

/** Money Manager-style entry: one dialog with Expense / Income / Transfer tabs. */
export function TxnEntryDialog({ initialType = 'expense', row, draft, defaultMonth, accountId, onClose }: { initialType?: TxnType; row?: any; draft?: any; defaultMonth: string; accountId?: string; onClose: () => void }) {
  const { data, db } = useWealth()
  const cats = useCategories()
  const [type, setType] = useState<TxnType>(row ? 'expense' : initialType)
  const seed = row ?? draft
  const todayIso = toISO(new Date())
  const startDate = seed?.date || (defaultMonth === todayIso.slice(0, 7) ? todayIso : `${defaultMonth}-01`)

  const accounts: any[] = data.bankAccounts
  const bankAccs = accounts.filter((a) => a.type !== 'cash')
  const cashAcc = accounts.find((a) => a.type === 'cash')
  const [f, setF] = useState({
    amount: String(seed?.amount ?? ''), date: startDate, note: seed?.note || '',
    category: seed?.category || cats.expense[0] || 'Other', incomeCategory: cats.income[0] || 'Other',
    mode: seed?.mode || 'upi', cardId: seed?.cardId || data.cards[0]?.id || '', debitCardId: seed?.debitCardId || data.debitCards[0]?.id || '', accountId: seed?.accountId || bankAccs[0]?.id || '',
    receiveId: accountId || accounts[0]?.id || '',
    from: accountId ? `account:${accountId}` : bankAccs[0] ? `account:${bankAccs[0].id}` : cashAcc ? `account:${cashAcc.id}` : '',
    to: (() => { const other = accounts.find((a) => a.id !== accountId && (!accountId || true)); return cashAcc && cashAcc.id !== accountId ? `account:${cashAcc.id}` : other ? `account:${other.id}` : '' })(),
  })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))

  const debit = data.debitCards.find((d: any) => d.id === f.debitCardId)
  const target = f.mode === 'cash' ? cashAcc : f.mode === 'debit' ? accounts.find((a) => a.id === debit?.accountId) : f.mode === 'card' ? null : accounts.find((a) => a.id === f.accountId)
  const parse = (v: string) => { const [t, ...r] = v.split(':'); return { type: t as 'account' | 'card', id: r.join(':') } }

  // Transfer endpoints. A debit card is a way to reach its linked account, so it resolves to that account.
  const fromOptions = [
    ...accounts.map((a) => ({ v: `account:${a.id}`, l: `${a.type === 'cash' ? 'Cash' : 'Bank'}: ${label(a)} (${formatINR(a.currentBalance)})` })),
    ...data.debitCards.map((d: any) => ({ v: `account:${d.accountId}`, l: `Debit card: ${cardLabel(d)}` })),
    ...data.cards.map((c: any) => ({ v: `card:${c.id}`, l: `Credit card: ${cardLabel(c)} (cash advance)` })),
  ]
  const toOptions = [
    ...accounts.map((a) => ({ v: `account:${a.id}`, l: `${a.type === 'cash' ? 'Cash' : 'Bank'}: ${label(a)}` })),
    ...data.cards.filter((c: any) => c.outstanding > 0).map((c: any) => ({ v: `card:${c.id}`, l: `Pay credit card: ${cardLabel(c)} (due ${formatINR(c.outstanding)})` })),
  ]

  // AI category suggestion: shown as a hint the user can accept; never changes anything by itself
  const rules = data.meta.find((m: any) => m.key === 'categoryRules')?.value ?? {}
  const suggestion = type === 'expense' ? suggestCategory(f.note, cats.expense, rules) : null
  const dupes = type === 'expense' && Number(f.amount) > 0 ? findDuplicates({ id: row?.id, amount: Number(f.amount), date: f.date, category: f.category, note: f.note }, data.expenses) : []
  const title = row ? 'Edit expense' : 'Add transaction'

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={title} submitLabel={row ? 'Save' : `Add ${type}`}
      onSubmit={async () => {
        const amount = Number(f.amount)
        if (!(amount > 0)) throw new Error('Amount must be greater than zero')
        if (f.date > todayIso) throw new Error('Date cannot be in the future')
        if (type === 'expense') {
          if (f.mode === 'card' && !f.cardId) throw new Error('Choose a credit card')
          if (f.mode === 'cash' && !cashAcc) throw new Error('Add a Cash account in Bank Accounts first')
          if (f.mode === 'debit' && !debit) throw new Error('Add a debit card under Cards first')
          if ((f.mode === 'upi' || f.mode === 'bank') && !f.accountId) throw new Error('Choose a bank account')
          const rec = { amount, date: f.date, category: f.category, mode: f.mode, cardId: f.mode === 'card' ? f.cardId : null, debitCardId: f.mode === 'debit' ? f.debitCardId : null, accountId: f.mode === 'cash' ? cashAcc!.id : f.mode === 'debit' ? debit!.accountId : f.mode === 'card' ? null : f.accountId, note: f.note }
          row ? await updateExpense(db, row.id, rec) : await addExpense(db, rec)
          // learn from the category the user finally chose, so the next suggestion matches
          if (f.note.trim()) await db.meta.put({ key: 'categoryRules', value: learnCorrection(rules, f.note, f.category) })
        } else if (type === 'income') {
          await addIncome(db, { accountId: f.receiveId, amount, date: f.date, category: f.incomeCategory, description: f.note })
        } else {
          await addTransfer(db, { from: parse(f.from), to: parse(f.to), amount, date: f.date, note: f.note })
        }
        toast.success(row ? 'Expense updated' : `${TYPES.find((t) => t.v === type)!.l} added`)
      }}>
      {!row && (
        <div role="tablist" aria-label="Transaction type" className="full grid grid-cols-3 rounded-lg bg-muted p-1 text-sm font-medium">
          {TYPES.map((t) => (
            <button key={t.v} type="button" role="tab" aria-selected={type === t.v} onClick={() => setType(t.v)} className={cn('rounded-md py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', type === t.v ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>{t.l}</button>
          ))}
        </div>
      )}
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" min="0.01" step="any" required autoFocus value={f.amount} onChange={set('amount')} />}</Field>
      <Field label="Date">{(id) => <Input id={id} type="date" required max={todayIso} value={f.date} onChange={set('date')} />}</Field>

      {type === 'expense' && <>
        <Field label="Category">{(id) => <Select id={id} value={f.category} onChange={set('category')}>{cats.expense.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
        <Field label="Paid via">{(id) => <Select id={id} value={f.mode} onChange={set('mode')}>{PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select>}</Field>
        {f.mode === 'card' && <Field label="Credit card" className="full">{(id) => <Select id={id} value={f.cardId} onChange={set('cardId')}>{data.cards.length === 0 && <option value="">No credit cards</option>}{data.cards.map((c: any) => <option key={c.id} value={c.id}>{cardLabel(c)}</option>)}</Select>}</Field>}
        {f.mode === 'debit' && <Field label="Debit card" className="full">{(id) => <Select id={id} value={f.debitCardId} onChange={set('debitCardId')}>{data.debitCards.length === 0 && <option value="">No debit cards</option>}{data.debitCards.map((d: any) => <option key={d.id} value={d.id}>{cardLabel(d)}</option>)}</Select>}</Field>}
        {(f.mode === 'upi' || f.mode === 'bank') && <Field label="From account" className="full">{(id) => <Select id={id} value={f.accountId} onChange={set('accountId')}>{bankAccs.length === 0 && <option value="">No bank accounts</option>}{bankAccs.map((a) => <option key={a.id} value={a.id}>{label(a)} ({formatINR(a.currentBalance)})</option>)}</Select>}</Field>}
        <p className="full text-xs text-muted-foreground">{f.mode === 'card' ? 'Adds to the credit card outstanding. Paying the card bill later is a transfer, not another expense.' : target ? `Deducted from ${label(target)} (balance ${formatINR(target.currentBalance)}, available ${formatINR(availableBalance(target))}).${target.mab && target.currentBalance - Number(f.amount || 0) < target.mab ? ` This takes the account below its ${formatINR(target.mab)} minimum balance; the bank may charge a penalty.` : ''}` : f.mode === 'cash' ? 'No cash account yet. Add one in Bank Accounts.' : ''}</p>
      </>}

      {type === 'income' && <>
        <Field label="Category">{(id) => <Select id={id} value={f.incomeCategory} onChange={set('incomeCategory')}>{cats.income.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
        <Field label="Received in">{(id) => <Select id={id} required value={f.receiveId} onChange={set('receiveId')}>{accounts.length === 0 && <option value="">No accounts</option>}{accounts.map((a) => <option key={a.id} value={a.id}>{a.type === 'cash' ? 'Cash' : 'Bank'}: {label(a)}</option>)}</Select>}</Field>
      </>}

      {type === 'transfer' && <>
        <Field label="From" className="full">{(id) => <Select id={id} value={f.from} onChange={set('from')}>{fromOptions.length === 0 && <option value="">Nothing to transfer from</option>}{fromOptions.map((o, i) => <option key={`${o.v}-${i}`} value={o.v}>{o.l}</option>)}</Select>}</Field>
        <Field label="To" className="full">{(id) => <Select id={id} value={f.to} onChange={set('to')}>{toOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</Select>}</Field>
        <p className="full text-xs text-muted-foreground">Moves money between your own accounts. Withdrawing cash from the bank is Bank → Cash; paying a card bill is → Pay credit card. Transfers are never counted as income or spending.</p>
      </>}

      <Field label="Note" className="full">{(id) => <Input id={id} value={f.note} onChange={set('note')} placeholder={type === 'transfer' ? 'e.g. ATM withdrawal' : type === 'expense' ? 'e.g. Swiggy' : ''} />}</Field>
      {suggestion && suggestion.category !== f.category && (
        <p className="full flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
          Suggested category for <strong>{suggestion.merchant}</strong>: <strong>{suggestion.category}</strong>{suggestion.subscription ? ' (looks like a subscription)' : ''}{suggestion.source === 'learned' ? ', learned from your earlier choice' : ''}.
          <button type="button" className="rounded-md border border-border bg-card px-2 py-0.5 font-medium hover:bg-muted" onClick={() => setF((p) => ({ ...p, category: suggestion.category }))}>Use it</button>
        </p>
      )}
      {dupes.length > 0 && <p role="status" className="full rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">Possible duplicate: you already have a {formatINR(dupes[0].amount)} {dupes[0].category} expense on {dupes[0].date}. Save only if this is a separate payment.</p>}
    </FormDialog>
  )
}
