'use client'

import { useState } from 'react'
import { toISO } from '@/lib/wealth/calc'
import { Input } from '@/components/ui/input'
import { Field, Select, StepFormDialog } from './kit'
import { POPULAR_BANKS } from '@/lib/wealth/banks'
import { useWealth } from '@/lib/wealth/WealthContext'

export const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings' },
  { value: 'joint', label: 'Joint savings' },
  { value: 'salary', label: 'Salary account' },
  { value: 'cash', label: 'Cash' }, // the one built-in Cash account; it is not offered when adding
]

export const isCash = (a: { type?: string } | undefined | null) => a?.type === 'cash'
export const accountLabel = (a: { nickname?: string; bankName?: string }) => a.nickname || a.bankName || 'Account'

export function AccountForm({ row, onClose, onSave }: { row?: any; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const { data } = useWealth()
  const ownerName: string = data.meta.find((m: any) => m.key === 'profile')?.value?.name || ''
  const [f, setF] = useState({
    bankName: row?.bankName || '', holderName: row?.holderName || '', nickname: row?.nickname || '', accountNumber: row?.accountNumber || '',
    ifsc: row?.ifsc || '', type: row?.type || 'savings', currentBalance: String(row?.currentBalance ?? ''), mab: String(row?.mab ?? ''), notes: row?.notes || '',
  })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  const cash = f.type === 'cash'
  const joint = f.type === 'joint' // the holders' names are asked for only on a joint account
  return (
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit account' : 'Add account'} wide
      description="Add bank accounts or a cash wallet. Expenses, income, transfers, card payments, SIPs and premiums all update these balances."
      onSubmit={async () => {
        const cur = Number(f.currentBalance)
        if (!Number.isFinite(cur) || cur < 0) throw new Error('Enter a valid balance')
        if (!cash && f.mab !== '' && !(Number(f.mab) >= 0)) throw new Error('MAB must be zero or more')
        if (joint && !f.holderName.trim()) throw new Error('Enter the names of the joint holders')
        if (!cash) {
          if (f.ifsc && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(f.ifsc)) throw new Error('IFSC must look like HDFC0001234')
          if (!/^\d{6,18}$/.test(f.accountNumber)) throw new Error('Account number must be 6-18 digits')
        }
        await onSave({
          ...row, ...f,
          bankName: cash ? 'Cash' : f.bankName, nickname: cash ? 'Cash' : f.nickname, holderName: cash ? '-' : joint ? f.holderName.trim() : row?.holderName && row.type !== 'joint' ? row.holderName : ownerName,
          accountNumber: cash ? '' : f.accountNumber, ifsc: cash ? '' : f.ifsc.toUpperCase(),
          currentBalance: cur, mab: cash ? 0 : Number(f.mab) || 0, lastUpdated: toISO(new Date()),
        })
      }}
      steps={[
        { title: "Account", content: (<>
      {!cash && <Field label="Account type" className="full">{(id) => <Select id={id} value={f.type} onChange={set('type')}>{ACCOUNT_TYPES.filter((t) => t.value !== 'cash' || row?.type === 'cash').map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>}</Field>}
      {!cash && <Field label="Bank name">{(id) => <><Input id={id} required list="popular-banks" autoComplete="off" placeholder="Start typing, e.g. HDFC" value={f.bankName} onChange={set('bankName')} /><datalist id="popular-banks">{POPULAR_BANKS.map((b) => <option key={b} value={b} />)}</datalist></>}</Field>}
      {joint && <Field label="Joint holders" hint="Everyone named on the account">{(id) => <Input id={id} required value={f.holderName} onChange={set('holderName')} placeholder="e.g. Arjun Mehta, Priya Mehta" />}</Field>}
      {cash && <p className="full text-sm text-muted-foreground">Cash is built in and always called Cash. Set how much you have on the next step.</p>}
      {!cash && <Field label="Nickname">{(id) => <Input id={id} value={f.nickname} onChange={set('nickname')} />}</Field>}
        </>) },
        { title: "Balance", content: (<>
      {!cash && <Field label="Account number">{(id) => <Input id={id} required inputMode="numeric" value={f.accountNumber} onChange={set('accountNumber')} />}</Field>}
      {!cash && <Field label="IFSC (optional)">{(id) => <Input id={id} value={f.ifsc} onChange={set('ifsc')} />}</Field>}
      <Field label={cash ? 'Cash on hand (₹)' : 'Current balance (₹)'}>{(id) => <Input id={id} type="number" min="0" step="any" required value={f.currentBalance} onChange={set('currentBalance')} />}</Field>
      {!cash && <Field label="Minimum balance to maintain, MAB (₹)" hint={`Available balance = current balance − MAB${Number(f.currentBalance) ? ` = ₹${Math.max(0, Number(f.currentBalance) - (Number(f.mab) || 0)).toLocaleString('en-IN')}` : ''}`}>{(id) => <Input id={id} type="number" min="0" step="any" value={f.mab} onChange={set('mab')} />}</Field>}
      <Field label="Notes" className="full">{(id) => <Input id={id} value={f.notes} onChange={set('notes')} />}</Field>
        </>) },
      ]} />
  )
}
