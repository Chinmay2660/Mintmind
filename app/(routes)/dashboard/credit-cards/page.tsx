'use client'

import { useMemo, useState } from 'react'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deleteCard, payCard, save } from '@/lib/wealth/actions'
import { cardUtilisation, toISO } from '@/lib/wealth/calc'
import { cap, formatCompactINR, formatDate, formatINR } from '@/lib/wealth/format'
import { upcomingCardDues, nextDayOfMonth } from '@/lib/wealth/reminders'
import { lastMonths, monthKey, monthLabel } from '@/lib/wealth/selectors'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Progress, Select, Stat, chartAxis, chartColor, chartGrid, chartTooltipStyle, toneForPct } from '@/components/wealth/kit'
import { CopyButton, CopyValue } from '@/components/wealth/CopyButton'
import { DebitCardsTab } from '@/components/wealth/DebitCards'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { cn } from '@/lib/utils'

const NETWORKS = ['Visa', 'Mastercard', 'RuPay', 'American Express', 'Diners Club']

function CreditCardsTab() {
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [sel, setSel] = useState<string | null>(null)
  const [dlg, setDlg] = useState<null | { kind: 'card' | 'pay' | 'del'; row?: any }>(null)
  const today = useMemo(() => new Date(), [])
  const t = useMemo(() => {
    const limit = data.cards.reduce((s, c) => s + c.limit, 0)
    const outstanding = data.cards.reduce((s, c) => s + c.outstanding, 0)
    const ym = toISO(today).slice(0, 7)
    const monthSpend = data.expenses.filter((e) => e.mode === 'card' && monthKey(e.date) === ym).reduce((s, e) => s + e.amount, 0)
    return { limit, outstanding, available: limit - outstanding, util: cardUtilisation(limit, outstanding), monthSpend }
  }, [data.cards, data.expenses, today])
  if (!ready) return <LoadingBlock className="h-64" />

  const card = data.cards.find((c) => c.id === sel) ?? data.cards[0]
  const dues = upcomingCardDues(data.cards, today)
  const cardTxns = card ? data.expenses.filter((e) => e.mode === 'card' && e.cardId === card.id).sort((a, b) => b.date.localeCompare(a.date)) : []
  const statements = card ? data.cardStatements.filter((s) => s.cardId === card.id).sort((a, b) => b.statementDate.localeCompare(a.statementDate)) : []
  const payments = card ? data.cardPayments.filter((p) => p.cardId === card.id).sort((a, b) => b.date.localeCompare(a.date)) : []
  const spendTrend = card ? lastMonths(6).map((k) => ({ label: monthLabel(k), Spend: cardTxns.filter((e) => monthKey(e.date) === k).reduce((s, e) => s + e.amount, 0) })) : []

  return (
    <div className="space-y-5">
      <PageHeader description="Credit card dues are liabilities in your net worth, and repayments are not counted as expenses." actions={<Button onClick={() => setDlg({ kind: 'card' })}><Plus className="mr-1.5 h-4 w-4" />Add card</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total limit" value={<Money value={t.limit} />} />
        <Stat label="Outstanding" value={<Money value={t.outstanding} />} />
        <Stat label="Available credit" value={<Money value={t.available} />} />
        <Stat label="Utilisation" value={`${t.util}%`} hint={<Progress value={t.util} tone={toneForPct(t.util)} label="Utilisation" />} />
      </div>
      <p className="text-xs text-muted-foreground">Card spend this month: <Money value={t.monthSpend} /></p>

      {data.cards.length === 0 ? <Empty title="No credit cards" action={<Button onClick={() => setDlg({ kind: 'card' })}>Add card</Button>} /> : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.cards.map((c) => {
              const u = cardUtilisation(c.limit, c.outstanding)
              return (
                <button key={c.id} type="button" onClick={() => setSel(c.id)} aria-pressed={card?.id === c.id}
                  className={cn('surface-card block w-full p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', card?.id === c.id ? 'border-primary' : 'hover:border-primary/40')}>
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><CreditCard className="h-5 w-5" /></span>
                    <div className="min-w-0"><p className="truncate font-medium">{c.bank} {c.cardName}</p><p className="text-xs text-muted-foreground">{c.network} · {c.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}</p></div></div>
                  <div className="mt-4 flex items-end justify-between"><div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-semibold"><Money value={c.outstanding} /></p></div><p className="text-sm text-muted-foreground">{u}% of <Money value={c.limit} compact /></p></div>
                  <div className="mt-2"><Progress value={u} tone={toneForPct(u)} label={`${c.cardName} utilisation`} /></div>
                  <p className="mt-2 text-xs text-muted-foreground">{c.outstanding > 0 ? `Due ${formatDate(nextDayOfMonth(c.dueDay, today))}` : 'No dues'} · Statement day {c.statementDay}</p>
                </button>
              )
            })}
          </div>

          {card && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{card.bank} {card.cardName}</h2>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={card.outstanding <= 0} onClick={() => setDlg({ kind: 'pay', row: card })}>Record payment</Button>
                  <Button size="sm" variant="outline" onClick={() => setDlg({ kind: 'card', row: card })}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setDlg({ kind: 'del', row: card })}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
                </div>
              </div>
              <Panel title="Card details">
                <dl className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
                  <Item k="Card number" v={<CopyValue value={card.cardNumber} label="Card number" mono>{String(card.cardNumber).replace(/(d{4})(?=d)/g, '$1 ')}</CopyValue>} /><Item k="Holder" v={<CopyValue value={card.holder} label="Card holder" />} /><Item k="Network" v={card.network} />
                  <Item k="Limit" v={<Money value={card.limit} />} /><Item k="Available" v={<Money value={card.available} />} /><Item k="Statement date" v={`${card.statementDay} of month`} />
                  <Item k="Billing date" v={`${card.billingDay} of month`} /><Item k="Payment due date" v={`${card.dueDay} of month`} />
                </dl>
              </Panel>
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Monthly card spend">
                  <div className="h-52" role="img" aria-label="Monthly card spend chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={spendTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="label" {...chartAxis} /><YAxis {...chartAxis} width={44} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                    <Tooltip {...chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number) => (privacyMode ? '••••' : formatINR(v))} /><Bar dataKey="Spend" fill={chartColor(2)} radius={[4, 4, 0, 0]} />
                  </BarChart></ResponsiveContainer></div>
                </Panel>
                <Panel title="Upcoming dues">
                  {dues.length === 0 ? <Empty title="No dues" /> : <ul className="divide-y divide-border">{dues.map((d) => <li key={d.id} className="flex justify-between py-2.5 text-sm"><span>{d.title}<span className="block text-xs text-muted-foreground">{d.daysLeft === 0 ? 'Due today' : `In ${d.daysLeft} days`} · {formatDate(d.date)}</span></span><Money value={d.amount} className="font-medium" /></li>)}</ul>}
                </Panel>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="Transactions"><List empty="No card transactions" items={cardTxns.map((e) => ({ id: e.id, a: e.note || e.category, b: `${e.category} · ${formatDate(e.date)}`, v: -e.amount }))} /></Panel>
                <Panel title="Statements"><List empty="No statements" items={statements.map((s) => ({ id: s.id, a: `Statement ${formatDate(s.statementDate)}`, b: `Due ${formatDate(s.dueDate)} · ${cap(s.status)}`, v: s.amount, plain: true }))} /></Panel>
                <Panel title="Payments"><List empty="No payments" items={payments.map((p) => ({ id: p.id, a: p.note || 'Payment', b: formatDate(p.date), v: p.amount, plain: true }))} /></Panel>
              </div>
            </>
          )}
        </>
      )}

      {dlg?.kind === 'card' && <CardForm row={dlg.row} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'cards', r); toast.success('Card saved') }} />}
      {dlg?.kind === 'pay' && <PayForm card={dlg.row} accounts={data.bankAccounts} onClose={() => setDlg(null)} onSave={async (p) => { await payCard(db, { cardId: dlg.row.id, ...p } as any); toast.success('Payment recorded') }} />}
      <ConfirmDialog open={dlg?.kind === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this card?" description="Its statements and payments are removed and net worth updates." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await deleteCard(db, dlg!.row.id); setSel(null); setDlg(null); toast.success('Card deleted') }} />
    </div>
  )
}

const Item = ({ k, v }: { k: string; v: React.ReactNode }) => <div><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>

function List({ items, empty }: { items: { id: string; a: string; b: string; v: number; plain?: boolean }[]; empty: string }) {
  if (!items.length) return <Empty title={empty} />
  return <ul className="max-h-80 divide-y divide-border overflow-y-auto">{items.map((i) => <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0"><span className="block truncate">{i.a}</span><span className="text-xs capitalize text-muted-foreground">{i.b}</span></span><Money value={i.v} signed={!i.plain} className="shrink-0 font-medium" /></li>)}</ul>
}

function CardForm({ row, onClose, onSave }: { row?: any; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({ bank: row?.bank || '', cardName: row?.cardName || '', network: row?.network || 'Visa', cardNumber: row?.cardNumber || '', holder: row?.holder || '', limit: String(row?.limit ?? ''), outstanding: String(row?.outstanding ?? 0), statementDay: String(row?.statementDay ?? 1), billingDay: String(row?.billingDay ?? 1), dueDay: String(row?.dueDay ?? 20) })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  const day = (v: string, n: string) => { const x = Number(v); if (!(x >= 1 && x <= 31)) throw new Error(`${n} must be between 1 and 31`); return x }
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit card' : 'Add credit card'} wide
      onSubmit={async () => {
        const limit = Number(f.limit), out = Number(f.outstanding)
        if (!(limit > 0)) throw new Error('Limit must be positive')
        if (out < 0 || out > limit) throw new Error('Outstanding must be between 0 and the limit')
        if (!/^\d{13,19}$/.test(f.cardNumber.replace(/\s/g, ''))) throw new Error('Card number must be 13-19 digits')
        await onSave({ ...row, ...f, cardNumber: f.cardNumber.replace(/\s/g, ''), limit, outstanding: out, available: limit - out, statementDay: day(f.statementDay, 'Statement day'), billingDay: day(f.billingDay, 'Billing day'), dueDay: day(f.dueDay, 'Due day') })
      }}>
      <Field label="Bank">{(id) => <Input id={id} required value={f.bank} onChange={set('bank')} />}</Field>
      <Field label="Card name">{(id) => <Input id={id} required value={f.cardName} onChange={set('cardName')} />}</Field>
      <Field label="Network">{(id) => <Select id={id} value={f.network} onChange={set('network')}>{NETWORKS.map((n) => <option key={n}>{n}</option>)}</Select>}</Field>
      <Field label="Card holder">{(id) => <Input id={id} required value={f.holder} onChange={set('holder')} />}</Field>
      <Field label="Card number" className="full">{(id) => <Input id={id} inputMode="numeric" required value={f.cardNumber} onChange={set('cardNumber')} />}</Field>
      <Field label="Credit limit (₹)">{(id) => <Input id={id} type="number" min="1" step="any" required value={f.limit} onChange={set('limit')} />}</Field>
      <Field label="Outstanding (₹)">{(id) => <Input id={id} type="number" min="0" step="any" required value={f.outstanding} onChange={set('outstanding')} />}</Field>
      <Field label="Statement day">{(id) => <Input id={id} type="number" min="1" max="31" value={f.statementDay} onChange={set('statementDay')} />}</Field>
      <Field label="Billing day">{(id) => <Input id={id} type="number" min="1" max="31" value={f.billingDay} onChange={set('billingDay')} />}</Field>
      <Field label="Payment due day">{(id) => <Input id={id} type="number" min="1" max="31" value={f.dueDay} onChange={set('dueDay')} />}</Field>
    </FormDialog>
  )
}

function PayForm({ card, accounts, onClose, onSave }: { card: any; accounts: any[]; onClose: () => void; onSave: (p: { amount: number; accountId?: string; date: string; note: string }) => Promise<void> }) {
  const [f, setF] = useState({ amount: String(card.outstanding), accountId: '', date: toISO(new Date()), note: '' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Record card payment" description="Reduces the outstanding and, if chosen, the paying account's balance. Not counted as an expense."
      onSubmit={async () => { const a = Number(f.amount); if (!(a > 0)) throw new Error('Amount must be positive'); if (a > card.outstanding) throw new Error('Payment exceeds the outstanding amount'); await onSave({ amount: a, accountId: f.accountId || undefined, date: f.date, note: f.note }) }}>
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" min="0.01" step="any" required value={f.amount} onChange={set('amount')} />}</Field>
      <Field label="Date">{(id) => <Input id={id} type="date" required value={f.date} onChange={set('date')} />}</Field>
      <Field label="Paid from" className="full">{(id) => <Select id={id} value={f.accountId} onChange={set('accountId')}><option value="">Not linked to a bank account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.nickname || a.bankName}</option>)}</Select>}</Field>
      <Field label="Note" className="full">{(id) => <Input id={id} value={f.note} onChange={set('note')} />}</Field>
    </FormDialog>
  )
}

export default function CardsPage() {
  const [tab, setTab] = useState<'Credit cards' | 'Debit cards'>('Credit cards')
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Card type" className="flex gap-1 border-b border-border">
        {(['Credit cards', 'Debit cards'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:bg-muted', tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t}</button>)}
      </div>
      {tab === 'Credit cards' ? <CreditCardsTab /> : <DebitCardsTab />}
    </div>
  )
}
