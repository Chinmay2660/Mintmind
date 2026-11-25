'use client'

import { BackBar } from '@/components/shell/BackBar'
import { useMemo, useState } from 'react'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, ChevronRight, CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addExpense, addIncome, remove, save } from '@/lib/wealth/actions'
import { useCategories } from '@/lib/wealth/useCategories'
import { availableBalance, toISO } from '@/lib/wealth/calc'
import { formatCompactINR, formatDate, formatINR, modeLabel } from '@/lib/wealth/format'
import { lastMonths, monthKey, monthLabel } from '@/lib/wealth/selectors'
import { Money } from './Money'
import { CopyValue } from './CopyButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, StepFormDialog, PageHeader, Panel, Select, Stat, chartAxis, chartColor, chartGrid, chartTooltipStyle } from './kit'
import { accountLabel, isCash } from './AccountForm'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { cn } from '@/lib/utils'
import { DateInput } from '@/components/ui/pickers'

const NETWORKS = ['Visa', 'Mastercard', 'RuPay', 'Maestro']

/** Debit cards: each one spends straight from its linked bank account, so every purchase lowers that balance. */
export function DebitCardsTab() {
  const { data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [sel, setSel] = useState<string | null>(null)
  const [dlg, setDlg] = useState<null | { row?: any; del?: boolean; txn?: boolean }>(null)
  const banks = data.bankAccounts.filter((a: any) => !isCash(a))
  const cards: any[] = data.debitCards
  const card = sel ? cards.find((c) => c.id === sel) : undefined
  useDetailCrumb(card ? `${card.bank} ${card.cardName}` : null, () => setSel(null))
  const acc = (id: string) => data.bankAccounts.find((a: any) => a.id === id)
  const ym = toISO(new Date()).slice(0, 7)

  const spendOf = (id: string) => data.expenses.filter((e: any) => e.debitCardId === id)
  const monthSpend = cards.reduce((s, c) => s + spendOf(c.id).filter((e: any) => monthKey(e.date) === ym).reduce((x: number, e: any) => x + e.amount, 0), 0)
  const linkedBalance = [...new Set(cards.map((c) => c.accountId))].reduce((s: number, id) => s + (acc(id as string)?.currentBalance || 0), 0)

  const txns = useMemo(() => (card ? data.expenses.filter((e: any) => e.debitCardId === card.id).sort((a: any, b: any) => b.date.localeCompare(a.date)) : []), [card, data.expenses])
  const trend = useMemo(() => lastMonths(6).map((k) => ({ label: monthLabel(k), Spend: txns.filter((e: any) => monthKey(e.date) === k).reduce((s: number, e: any) => s + e.amount, 0) })), [txns])
  const cardAcc = card ? acc(card.accountId) : null

  return (
    <div className="space-y-5">
      <PageHeader secondaryAction={{ label: 'Add transaction', disabled: cards.length === 0, onClick: () => setDlg({ txn: true, row: card }) }} primaryAction={{ label: 'Add card', disabled: banks.length === 0, onClick: () => setDlg({}) }} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 border-b border-border pb-5">
        <Stat label="Debit cards" value={cards.length} />
        <Stat label="Spent this month" value={<Money value={monthSpend} />} />
        <Stat label="Linked account balance" value={<Money value={linkedBalance} />} hint="Across linked accounts" />
      </div>

      {cards.length === 0 ? <Empty title="No debit cards" description={banks.length ? 'Add a debit card to record spending against a bank account.' : 'Add a bank account first, then link a debit card to it.'} action={banks.length ? <Button onClick={() => setDlg({})}>Add debit card</Button> : undefined} /> : (
        <>
          {!card && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => {
              const a = acc(c.accountId)
              return (
                <button key={c.id} type="button" aria-label={`${c.bank} ${c.cardName}, open details`} onClick={() => setSel(c.id)} className={cn('surface-card block w-full p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', 'hover:border-primary/40')}>
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4"><CreditCard className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate font-medium">{c.bank} {c.cardName}</p><p className="text-xs text-muted-foreground">{c.network} · ···· {String(c.cardNumber).slice(-4)}</p></div>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" /></div>
                  <div className="mt-4 flex items-end justify-between"><div className="min-w-0"><p className="text-xs text-muted-foreground">Linked account</p><p className="truncate text-sm font-medium">{a ? accountLabel(a) : 'Not linked'}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Balance</p><p className="font-semibold">{a ? <Money value={a.currentBalance} /> : '-'}</p></div></div>
                </button>
              )
            })}
          </div>}

          {card && (
            <>
              <BackBar onBack={() => setSel(null)} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{card.bank} {card.cardName}</h2>
                <div className="flex gap-2"><Button size="sm" onClick={() => setDlg({ txn: true, row: card })}>Add transaction</Button><Button size="sm" variant="outline" onClick={() => setDlg({ row: card })}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button><Button size="sm" variant="outline" onClick={() => setDlg({ row: card, del: true })}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button></div>
              </div>
              <Panel title="Card details">
                <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-xs text-muted-foreground">Card number</dt><dd><CopyValue value={card.cardNumber} label="Card number" mono>{String(card.cardNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}</CopyValue></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Card holder</dt><dd><CopyValue value={card.holder} label="Card holder" /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Network</dt><dd>{card.network}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Linked account</dt><dd>{cardAcc ? accountLabel(cardAcc) : '-'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Account balance</dt><dd>{cardAcc ? <Money value={cardAcc.currentBalance} /> : '-'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Available to spend</dt><dd>{cardAcc ? <Money value={availableBalance(cardAcc)} /> : '-'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Spent this month</dt><dd><Money value={txns.filter((e: any) => monthKey(e.date) === ym).reduce((s: number, e: any) => s + e.amount, 0)} /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Last used</dt><dd>{txns[0] ? formatDate(txns[0].date) : '-'}</dd></div>
                </dl>
              </Panel>
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Monthly spend">
                  <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="label" {...chartAxis} /><YAxis {...chartAxis} width={44} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                    <Tooltip {...chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number) => (privacyMode ? '••••' : formatINR(v))} /><Bar dataKey="Spend" fill={chartColor(1)} radius={[4, 4, 0, 0]} />
                  </BarChart></ResponsiveContainer></div>
                </Panel>
                <Panel title="Transactions">
                  {txns.length === 0 ? <Empty title="No transactions on this card" /> : (
                    <ul className="max-h-64 divide-y divide-border overflow-y-auto">{txns.map((e: any) => <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0"><span className="block truncate font-medium">{e.note || e.category}</span><span className="text-xs text-muted-foreground">{e.category} · {formatDate(e.date)} · {modeLabel(e.mode)}</span></span><Money value={-e.amount} signed className="shrink-0 font-medium" /></li>)}</ul>
                  )}
                </Panel>
              </div>
            </>
          )}
        </>
      )}
      {dlg?.txn && <DebitTxnForm cards={cards} card={dlg.row} accountOf={acc} onClose={() => setDlg(null)}
        onSpend={async (p) => { await addExpense(db, { amount: p.amount, date: p.date, category: p.category, mode: 'debit', accountId: p.accountId, cardId: null, debitCardId: p.cardId, note: p.note }); toast.success('Spend recorded') }}
        onRefund={async (p) => { await addIncome(db, { accountId: p.accountId, amount: p.amount, date: p.date, category: 'Refund', description: p.note || 'Refund to debit card' }); toast.success('Refund recorded') }} />}
      {dlg && !dlg.del && !dlg.txn && <DebitForm row={dlg.row} accounts={banks} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'debitCards', r); toast.success('Debit card saved') }} />}
      <ConfirmDialog open={!!dlg?.del} onOpenChange={(o) => !o && setDlg(null)} title="Delete this debit card?" description="Past expenses stay in your history." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'debitCards', dlg!.row.id); setSel(null); setDlg(null); toast.success('Debit card deleted') }} />
    </div>
  )
}

/**
 * Both directions on a debit card. A spend lowers the linked bank balance and counts as spending; a refund puts money back into
 * that balance. The card you have open is chosen for you, or you pick one.
 */
function DebitTxnForm({ cards, card, accountOf, onClose, onSpend, onRefund }: { cards: any[]; card?: any; accountOf: (id: string) => any; onClose: () => void; onSpend: (p: { cardId: string; accountId: string; amount: number; category: string; date: string; note: string }) => Promise<void>; onRefund: (p: { accountId: string; amount: number; date: string; note: string }) => Promise<void> }) {
  const cats = useCategories()
  const [mode, setMode] = useState<'spend' | 'refund'>('spend')
  const [f, setF] = useState({ cardId: (card ?? cards[0])?.id ?? '', amount: '', date: toISO(new Date()), note: '', category: cats.expense[0] || 'Other' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  const cur = cards.find((x) => x.id === f.cardId)
  const acct = cur ? accountOf(cur.accountId) : null
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Add a debit card transaction" submitLabel={mode === 'spend' ? 'Record spend' : 'Record refund'}
      onSubmit={async () => {
        const a = Number(f.amount)
        if (!cur || !acct) throw new Error('Choose a card')
        if (!(a > 0)) throw new Error('Amount must be positive')
        if (!f.date) throw new Error('Choose the date')
        if (mode === 'spend') { if (a > availableBalance(acct)) throw new Error(`The linked account has only ${formatINR(availableBalance(acct))} available`); await onSpend({ cardId: cur.id, accountId: cur.accountId, amount: a, category: f.category, date: f.date, note: f.note }) }
        else await onRefund({ accountId: cur.accountId, amount: a, date: f.date, note: f.note })
      }}>
      <div className="full">
        <div role="radiogroup" aria-label="Type of transaction" className="grid grid-cols-2 rounded-xl border border-border bg-muted p-1">
          {([['spend', 'Spend', 'Money leaves the account'], ['refund', 'Refund', 'Money comes back']] as const).map(([v, l, n]) => (
            <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} className={cn('rounded-lg px-3 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring', mode === v ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>{l}<span className="block text-[11px] font-normal text-muted-foreground">{n}</span></button>
          ))}
        </div>
      </div>
      <Field label="Card" className="full">{(id) => <Select id={id} value={f.cardId} onChange={set('cardId')}>{cards.map((x) => <option key={x.id} value={x.id}>{x.bank} {x.cardName} · •••• {String(x.cardNumber).slice(-4)}</option>)}</Select>}</Field>
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" min="0.01" step="any" inputMode="decimal" required value={f.amount} onChange={set('amount')} />}</Field>
      <Field label="Date">{(id) => <DateInput id={id} required value={f.date} onChange={set('date')} />}</Field>
      {mode === 'spend' && <Field label="Category" className="full">{(id) => <Select id={id} value={f.category} onChange={set('category')}>{cats.expense.map((c: string) => <option key={c}>{c}</option>)}</Select>}</Field>}
      <Field label="Note" className="full">{(id) => <Input id={id} value={f.note} onChange={set('note')} />}</Field>
    </FormDialog>
  )
}

function DebitForm({ row, accounts, onClose, onSave }: { row?: any; accounts: any[]; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({ bank: row?.bank || accounts[0]?.bankName || '', cardName: row?.cardName || '', network: row?.network || 'Visa', cardNumber: row?.cardNumber || '', holder: row?.holder || accounts[0]?.holderName || '', accountId: row?.accountId || accounts[0]?.id || '' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit debit card' : 'Add debit card'} wide
      onSubmit={async () => {
        if (!/^\d{13,19}$/.test(f.cardNumber.replace(/\s/g, ''))) throw new Error('Card number must be 13-19 digits')
        if (!f.accountId) throw new Error('Choose the linked account')
        await onSave({ ...row, ...f, cardNumber: f.cardNumber.replace(/\s/g, '') })
      }}
      steps={[
        { title: "Linked account", description: "Every purchase on this card is taken from this bank account.", content: <>
      <Field label="Linked bank account" className="full">{(id) => <Select id={id} required value={f.accountId} onChange={(e) => { const a = accounts.find((x) => x.id === e.target.value); setF((p) => ({ ...p, accountId: e.target.value, bank: a?.bankName || p.bank, holder: p.holder || a?.holderName || '' })) }}>{accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)} ({a.bankName})</option>)}</Select>}</Field>
      <Field label="Bank">{(id) => <Input id={id} required value={f.bank} onChange={set('bank')} />}</Field>
        </> },
        { title: "Card details", description: "As printed on the card.", content: <>
      <Field label="Card name">{(id) => <Input id={id} required value={f.cardName} onChange={set('cardName')} placeholder="Platinum Debit" />}</Field>
      <Field label="Network">{(id) => <Select id={id} value={f.network} onChange={set('network')}>{NETWORKS.map((n) => <option key={n}>{n}</option>)}</Select>}</Field>
      <Field label="Card holder">{(id) => <Input id={id} required value={f.holder} onChange={set('holder')} />}</Field>
      <Field label="Card number" className="full">{(id) => <Input id={id} inputMode="numeric" required value={f.cardNumber} onChange={set('cardNumber')} />}</Field>
        </> },
      ]} />
  )
}
