'use client'

import { GrowwChart } from '@/components/wealth/GrowwChart'
import { BackBar } from '@/components/shell/BackBar'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deleteBankAccount, save, setBankBalance } from '@/lib/wealth/actions'
import { TxnEntryDialog, type TxnType } from '@/components/wealth/budget/TxnEntryDialog'
import { availableBalance, mabShortfall } from '@/lib/wealth/calc'
import { cap, formatCompactINR, formatDate, formatINR, modeLabel } from '@/lib/wealth/format'
import { lastMonths, monthKey, monthLabel } from '@/lib/wealth/selectors'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, LoadingBlock, Metric, Panel, Stat, chartAxis, chartColor, chartGrid, chartTooltipStyle } from '@/components/wealth/kit'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { CopyValue } from '@/components/wealth/CopyButton'
import { AccountForm, ACCOUNT_TYPES } from '@/components/wealth/AccountForm'

export default function BankAccountDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [dlg, setDlg] = useState<null | 'edit' | 'balance' | 'delete'>(null)
  const [entry, setEntry] = useState<null | TxnType>(null)

  const acc = data.bankAccounts.find((b) => b.id === id)
  const history = useMemo(() => data.balanceHistory.filter((h) => h.accountId === id).sort((a, b) => a.date.localeCompare(b.date)), [data.balanceHistory, id])
  const txns = useMemo(() => {
    const own = data.bankTxns.filter((t) => t.accountId === id).map((t) => ({ id: t.id, date: t.date, desc: t.description, kind: t.type as string, amount: t.type === 'income' ? t.amount : -t.amount }))
    const moves = data.transfers.filter((t: any) => (t.fromType === 'account' && t.fromId === id) || (t.toType === 'account' && t.toId === id)).map((t: any) => { const out = t.fromType === 'account' && t.fromId === id; return { id: t.id, date: t.date, desc: t.note || (out ? 'Transfer out' : 'Transfer in'), kind: 'transfer', amount: out ? -t.amount : t.amount } })
    const spent = data.expenses.filter((e) => e.mode !== 'card' && e.accountId === id).map((e) => ({ id: e.id, date: e.date, desc: `${e.category}${e.note ? ` - ${e.note}` : ''}`, kind: `Expense · ${modeLabel(e.mode)}`, amount: -e.amount }))
    return [...own, ...moves, ...spent].sort((a, b) => b.date.localeCompare(a.date))
  }, [data.bankTxns, data.expenses, data.transfers, id])
  // monthly trend: closing balance per month (last recorded balance on/before month end)
  const trend = useMemo(() => lastMonths(12).map((k) => {
    const upto = history.filter((h) => monthKey(h.date) <= k)
    return { label: monthLabel(k), balance: upto.length ? upto[upto.length - 1].balance : null }
  }), [history])
  // balance after each transaction, worked back from today's balance (newest first)
  const withBalance = useMemo(() => {
    let running = acc?.currentBalance ?? 0
    return txns.map((t) => { const after = running; running -= t.amount; return { ...t, after } })
  }, [txns, acc?.currentBalance])
  const flow = useMemo(() => lastMonths(6).map((k) => ({ label: monthLabel(k), In: txns.filter((t) => monthKey(t.date) === k && t.amount > 0).reduce((s, t) => s + t.amount, 0), Out: txns.filter((t) => monthKey(t.date) === k && t.amount < 0).reduce((s, t) => s - t.amount, 0) })), [txns])

  if (!ready) return <LoadingBlock className="h-64" />
  if (!acc) return <Empty title="Account not found" action={<Link className="text-primary underline" href="/dashboard/bank-accounts">Back to accounts</Link>} />
  const ax = (v: number) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))

  return (
    <div className="space-y-5">
      <BackBar fallback="/dashboard/bank-accounts" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-semibold">{acc.nickname || acc.bankName}</h2><p className="text-sm text-muted-foreground">{acc.type === 'cash' ? 'Cash wallet' : `${acc.bankName} · ${ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label}`}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDlg('balance')}><RefreshCw className="mr-1.5 h-4 w-4" />Update balance</Button>
          <Button size="sm" variant="outline" onClick={() => setEntry('income')}><Plus className="mr-1.5 h-4 w-4" />Income</Button>
          <Button size="sm" variant="outline" onClick={() => setEntry('transfer')}>Transfer</Button>
          <Button size="sm" variant="outline" onClick={() => setDlg('edit')}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
          {acc.type !== 'cash' && <Button size="sm" variant="outline" onClick={() => setDlg('delete')}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Current balance" value={<Money value={acc.currentBalance} />} />
        {acc.type !== 'cash' && <Stat label="Available balance" value={<Money value={availableBalance(acc)} />} hint={mabShortfall(acc) > 0 ? <span className="text-warning">₹{mabShortfall(acc).toLocaleString('en-IN')} below MAB</span> : `Current − MAB (${acc.mab ? '₹' + Number(acc.mab).toLocaleString('en-IN') : 'none set'})`} />}
        <Stat label="Last updated" value={formatDate(acc.lastUpdated)} />
        {acc.type === 'joint' && <Stat label="Joint holders" value={<CopyValue value={acc.holderName} label="Account holder" />} />}
      </div>
      {acc.type !== 'cash' && <Panel title="Account details" action={<Button size="sm" variant="outline" onClick={() => { const t = [`Bank: ${acc.bankName}`, acc.holderName ? `Account holder: ${acc.holderName}` : '', `Account number: ${acc.accountNumber}`, acc.ifsc ? `IFSC: ${acc.ifsc}` : ''].filter(Boolean).join('\n'); navigator.clipboard.writeText(t).then(() => toast.success('Bank details copied'), () => toast.error('Could not copy')) }}>Copy all details</Button>}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Bank</dt><dd><CopyValue value={acc.bankName} label="Bank name" /></dd></div>
          {acc.type === 'joint' && <div><dt className="text-xs text-muted-foreground">Joint holders</dt><dd><CopyValue value={acc.holderName} label="Joint holders" /></dd></div>}
          <div><dt className="text-xs text-muted-foreground">Account number</dt><dd><CopyValue value={acc.accountNumber} label="Account number" mono /></dd></div>
          <div><dt className="text-xs text-muted-foreground">IFSC</dt><dd><CopyValue value={acc.ifsc} label="IFSC" mono /></dd></div>
          <div className="sm:col-span-2 lg:col-span-4"><dt className="text-xs text-muted-foreground">Notes</dt><dd>{acc.notes || '-'}</dd></div>
        </dl>
      </Panel>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Balance trend (12 months)">
          <GrowwChart height={190} ariaLabel="Balance over twelve months" format={(v) => (privacyMode ? '••••' : formatINR(v))} data={trend.filter((t: any) => t.balance != null).map((t: any) => ({ x: t.label, y: Number(t.balance) }))} />
        </Panel>
        <Panel title="Money in vs out (6 months)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={flow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="label" {...chartAxis} /><YAxis {...chartAxis} width={48} tickFormatter={ax} />
              <Tooltip {...chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number) => (privacyMode ? '••••' : formatINR(v))} />
              <Bar dataKey="In" fill={chartColor(1)} radius={[4, 4, 0, 0]} /><Bar dataKey="Out" fill={chartColor(3)} radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Transactions">
          {txns.length === 0 ? <Empty title="No transactions" /> : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {withBalance.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{t.desc}</span><span className="text-xs text-muted-foreground">{cap(t.kind)} · {formatDate(t.date)}</span></span>
                  <span className="flex shrink-0 flex-col items-end"><Money value={t.amount} signed className="font-medium" /><span className="text-xs text-muted-foreground">Balance <Money value={t.after} /></span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Balance history">
          {history.length === 0 ? <Empty title="No history" /> : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {history.map((h, i) => ({ h, prev: i > 0 ? history[i - 1].balance : null })).reverse().map(({ h, prev }) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block">{formatDate(h.date)}</span><span className="block truncate text-xs text-muted-foreground">{h.note}</span></span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5"><Money value={h.balance} className="font-medium" />{prev == null ? <span className="text-xs text-muted-foreground">Opening balance</span> : <Metric amount={h.balance - prev} pct={prev > 0 ? ((h.balance - prev) / prev) * 100 : null} />}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {dlg === 'edit' && <AccountForm row={acc} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'bankAccounts', r); toast.success('Account updated') }} />}
      {dlg === 'balance' && <BalanceForm current={acc.currentBalance} onClose={() => setDlg(null)} onSave={async (b, note) => { await setBankBalance(db, acc.id, b, { note }); toast.success('Balance updated') }} />}
      {entry && <TxnEntryDialog initialType={entry} accountId={acc.id} defaultMonth={new Date().toISOString().slice(0, 7)} onClose={() => setEntry(null)} />}
      <ConfirmDialog open={dlg === 'delete'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this account?" description="Its balance, history and transactions will be removed and net worth will update." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await deleteBankAccount(db, acc.id); toast.success('Account deleted'); router.push('/dashboard/bank-accounts') }} />
    </div>
  )
}

function BalanceForm({ current, onClose, onSave }: { current: number; onClose: () => void; onSave: (b: number, note: string) => Promise<void> }) {
  const [b, setB] = useState(String(current)); const [note, setNote] = useState('')
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Update balance" onSubmit={async () => { const n = Number(b); if (!Number.isFinite(n)) throw new Error('Enter a valid balance'); await onSave(n, note || 'Manual update') }}>
      <Field label="New balance (₹)" className="full">{(id) => <Input id={id} type="number" step="any" required value={b} onChange={(e) => setB(e.target.value)} />}</Field>
      <Field label="Note" className="full">{(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Statement balance" />}</Field>
    </FormDialog>
  )
}

