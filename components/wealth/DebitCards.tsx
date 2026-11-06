'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { availableBalance, toISO } from '@/lib/wealth/calc'
import { formatCompactINR, formatDate, formatINR, modeLabel } from '@/lib/wealth/format'
import { lastMonths, monthKey, monthLabel } from '@/lib/wealth/selectors'
import { Money } from './Money'
import { CopyValue } from './CopyButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, PageHeader, Panel, Select, Stat, chartAxis, chartColor, chartGrid, chartTooltipStyle } from './kit'
import { accountLabel, isCash } from './AccountForm'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { cn } from '@/lib/utils'

const NETWORKS = ['Visa', 'Mastercard', 'RuPay', 'Maestro']

/** Debit cards: each one spends straight from its linked bank account, so every purchase lowers that balance. */
export function DebitCardsTab() {
  const { data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [sel, setSel] = useState<string | null>(null)
  const [dlg, setDlg] = useState<null | { row?: any; del?: boolean }>(null)
  const banks = data.bankAccounts.filter((a: any) => !isCash(a))
  const cards: any[] = data.debitCards
  const card = cards.find((c) => c.id === sel) ?? cards[0]
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
      <PageHeader actions={<Button disabled={banks.length === 0} onClick={() => setDlg({})}><Plus className="mr-1.5 h-4 w-4" />Add card</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Debit cards" value={cards.length} />
        <Stat label="Spent this month" value={<Money value={monthSpend} />} />
        <Stat label="Linked account balance" value={<Money value={linkedBalance} />} hint="Across linked accounts" />
      </div>

      {cards.length === 0 ? <Empty title="No debit cards" description={banks.length ? 'Add a debit card to record spending against a bank account.' : 'Add a bank account first, then link a debit card to it.'} action={banks.length ? <Button onClick={() => setDlg({})}>Add debit card</Button> : undefined} /> : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => {
              const a = acc(c.accountId)
              return (
                <button key={c.id} type="button" aria-pressed={card?.id === c.id} onClick={() => setSel(c.id)} className={cn('surface-card block w-full p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', card?.id === c.id ? 'border-primary' : 'hover:border-primary/40')}>
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><CreditCard className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate font-medium">{c.bank} {c.cardName}</p><p className="text-xs text-muted-foreground">{c.network} · ···· {String(c.cardNumber).slice(-4)}</p></div></div>
                  <div className="mt-4 flex items-end justify-between"><div className="min-w-0"><p className="text-xs text-muted-foreground">Linked account</p><p className="truncate text-sm font-medium">{a ? accountLabel(a) : 'Not linked'}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Balance</p><p className="font-semibold">{a ? <Money value={a.currentBalance} /> : '—'}</p></div></div>
                </button>
              )
            })}
          </div>

          {card && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{card.bank} {card.cardName}</h2>
                <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setDlg({ row: card })}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button><Button size="sm" variant="outline" onClick={() => setDlg({ row: card, del: true })}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button></div>
              </div>
              <Panel title="Card details">
                <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-xs text-muted-foreground">Card number</dt><dd><CopyValue value={card.cardNumber} label="Card number" mono>{String(card.cardNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}</CopyValue></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Card holder</dt><dd><CopyValue value={card.holder} label="Card holder" /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Network</dt><dd>{card.network}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Linked account</dt><dd>{cardAcc ? accountLabel(cardAcc) : '—'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Account balance</dt><dd>{cardAcc ? <Money value={cardAcc.currentBalance} /> : '—'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Available to spend</dt><dd>{cardAcc ? <Money value={availableBalance(cardAcc)} /> : '—'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Spent this month</dt><dd><Money value={txns.filter((e: any) => monthKey(e.date) === ym).reduce((s: number, e: any) => s + e.amount, 0)} /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Last used</dt><dd>{txns[0] ? formatDate(txns[0].date) : '—'}</dd></div>
                </dl>
              </Panel>
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Monthly spend">
                  <div className="h-52" role="img" aria-label="Monthly debit card spend"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
      {dlg && !dlg.del && <DebitForm row={dlg.row} accounts={banks} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'debitCards', r); toast.success('Debit card saved') }} />}
      <ConfirmDialog open={!!dlg?.del} onOpenChange={(o) => !o && setDlg(null)} title="Delete this debit card?" description="Past expenses stay in your history." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'debitCards', dlg!.row.id); setSel(null); setDlg(null); toast.success('Debit card deleted') }} />
    </div>
  )
}

function DebitForm({ row, accounts, onClose, onSave }: { row?: any; accounts: any[]; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({ bank: row?.bank || accounts[0]?.bankName || '', cardName: row?.cardName || '', network: row?.network || 'Visa', cardNumber: row?.cardNumber || '', holder: row?.holder || accounts[0]?.holderName || '', accountId: row?.accountId || accounts[0]?.id || '' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit debit card' : 'Add debit card'} wide
      onSubmit={async () => {
        if (!/^\d{13,19}$/.test(f.cardNumber.replace(/\s/g, ''))) throw new Error('Card number must be 13-19 digits')
        if (!f.accountId) throw new Error('Choose the linked account')
        await onSave({ ...row, ...f, cardNumber: f.cardNumber.replace(/\s/g, '') })
      }}>
      <Field label="Linked bank account" className="full">{(id) => <Select id={id} required value={f.accountId} onChange={(e) => { const a = accounts.find((x) => x.id === e.target.value); setF((p) => ({ ...p, accountId: e.target.value, bank: a?.bankName || p.bank, holder: p.holder || a?.holderName || '' })) }}>{accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)} ({a.bankName})</option>)}</Select>}</Field>
      <Field label="Bank">{(id) => <Input id={id} required value={f.bank} onChange={set('bank')} />}</Field>
      <Field label="Card name">{(id) => <Input id={id} required value={f.cardName} onChange={set('cardName')} placeholder="Platinum Debit" />}</Field>
      <Field label="Network">{(id) => <Select id={id} value={f.network} onChange={set('network')}>{NETWORKS.map((n) => <option key={n}>{n}</option>)}</Select>}</Field>
      <Field label="Card holder">{(id) => <Input id={id} required value={f.holder} onChange={set('holder')} />}</Field>
      <Field label="Card number" className="full">{(id) => <Input id={id} inputMode="numeric" required value={f.cardNumber} onChange={set('cardNumber')} />}</Field>
    </FormDialog>
  )
}
