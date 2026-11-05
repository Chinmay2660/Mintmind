'use client'

import { useState } from 'react'
import { toISO } from '@/lib/wealth/calc'
import { Input } from '@/components/ui/input'
import { Field, FormDialog, Select } from './kit'
import { useWealth } from '@/lib/wealth/WealthContext'

export const INVESTMENT_TYPES = ['Lumpsum', 'SIP', 'SIP + Lumpsum']

export function FundForm({ row, onClose, onSave }: { row?: any; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({
    name: row?.name || '', folio: row?.folio || '', investmentType: row?.investmentType || 'Lumpsum',
    investmentDate: row?.investmentDate || toISO(new Date()), units: String(row?.units ?? ''), purchaseNav: String(row?.purchaseNav ?? ''), currentNav: String(row?.currentNav ?? ''),
    invested: String(row?.invested ?? ''), currentValue: String(row?.currentValue ?? ''), notes: row?.notes || '',
  })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit fund' : 'Add mutual fund'} wide
      onSubmit={async () => {
        const units = Number(f.units), pn = Number(f.purchaseNav), cn = Number(f.currentNav)
        const invested = f.invested === '' ? units * pn : Number(f.invested)
        const value = f.currentValue === '' ? units * cn : Number(f.currentValue)
        if (!(units > 0) || !(invested > 0)) throw new Error('Units and invested amount must be positive')
        if (!/^[A-Za-z0-9/\- ]{3,30}$/.test(f.folio)) throw new Error('Enter a valid folio number')
        await onSave({ ...row, ...f, units, purchaseNav: pn || invested / units, currentNav: cn || (units ? value / units : 0), invested, currentValue: Math.round(value * 100) / 100 })
      }}>
      <Field label="Fund name" className="full">{(id) => <Input id={id} required value={f.name} onChange={set('name')} />}</Field>
      <Field label="Folio number">{(id) => <Input id={id} required value={f.folio} onChange={set('folio')} />}</Field>
      <Field label="Investment type">{(id) => <Select id={id} value={f.investmentType} onChange={set('investmentType')}>{INVESTMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
      <Field label="First investment date">{(id) => <Input id={id} type="date" required value={f.investmentDate} onChange={set('investmentDate')} />}</Field>
      <Field label="Units held">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.units} onChange={set('units')} />}</Field>
      <Field label="Purchase NAV (avg)">{(id) => <Input id={id} type="number" step="any" min="0" value={f.purchaseNav} onChange={set('purchaseNav')} />}</Field>
      <Field label="Current NAV">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.currentNav} onChange={set('currentNav')} />}</Field>
      <Field label="Invested amount (₹)">{(id) => <Input id={id} type="number" step="any" min="0" value={f.invested} onChange={set('invested')} placeholder="units × purchase NAV" />}</Field>
      <Field label="Current value (₹)">{(id) => <Input id={id} type="number" step="any" min="0" value={f.currentValue} onChange={set('currentValue')} placeholder="units × current NAV" />}</Field>
      <Field label="Notes">{(id) => <Input id={id} value={f.notes} onChange={set('notes')} />}</Field>
    </FormDialog>
  )
}

export function NavForm({ fund, onClose, onSave }: { fund: any; onClose: () => void; onSave: (nav: number, date: string) => Promise<void> }) {
  const [nav, setNav] = useState(String(fund.currentNav || ''))
  const [date, setDate] = useState(toISO(new Date()))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Update NAV - ${fund.name}`}
      onSubmit={async () => { if (!(Number(nav) > 0)) throw new Error('NAV must be positive'); await onSave(Number(nav), date) }}>
      <Field label="NAV (₹)">{(id) => <Input id={id} type="number" step="any" required value={nav} onChange={(e) => setNav(e.target.value)} />}</Field>
      <Field label="NAV date">{(id) => <Input id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
    </FormDialog>
  )
}

export function InvestmentForm({ fund, onClose, onSave }: { fund: any; onClose: () => void; onSave: (v: { date: string; amount: number; nav: number; type: string }) => Promise<void> }) {
  const [f, setF] = useState({ date: toISO(new Date()), amount: '', nav: String(fund.currentNav || ''), type: 'lumpsum' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Add investment from statement"
      onSubmit={async () => { if (!(Number(f.amount) > 0) || !(Number(f.nav) > 0)) throw new Error('Amount and NAV must be positive'); await onSave({ date: f.date, amount: Number(f.amount), nav: Number(f.nav), type: f.type }) }}>
      <Field label="Date">{(id) => <Input id={id} type="date" required value={f.date} onChange={set('date')} />}</Field>
      <Field label="Type">{(id) => <Select id={id} value={f.type} onChange={set('type')}><option value="lumpsum">Lumpsum</option><option value="sip">SIP instalment</option></Select>}</Field>
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.amount} onChange={set('amount')} />}</Field>
      <Field label="NAV on that date">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.nav} onChange={set('nav')} />}</Field>
    </FormDialog>
  )
}

export function SipForm({ row, funds, onClose, onSave }: { row?: any; funds: any[]; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const { data } = useWealth()
  const [f, setF] = useState({ accountId: row?.accountId || '',
    fundId: row?.fundId || funds[0]?.id || '', amount: String(row?.amount ?? ''), frequency: row?.frequency || 'monthly', debitDay: String(row?.debitDay ?? 5),
    startDate: row?.startDate || toISO(new Date()), endDate: row?.endDate || '', instalmentsTotal: String(row?.instalmentsTotal ?? ''), instalmentsCompleted: String(row?.instalmentsCompleted ?? 0), status: row?.status || 'active',
  })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit SIP' : 'Add SIP'} wide
      onSubmit={async () => {
        if (!f.fundId) throw new Error('Add a fund first')
        if (!(Number(f.amount) > 0)) throw new Error('SIP amount must be positive')
        const day = Number(f.debitDay)
        if (!(day >= 1 && day <= 31)) throw new Error('Debit day must be 1-31')
        if (f.endDate && f.endDate < f.startDate) throw new Error('End date is before start date')
        await onSave({ ...row, ...f, accountId: f.accountId || null, amount: Number(f.amount), debitDay: day, instalmentsTotal: Number(f.instalmentsTotal) || 0, instalmentsCompleted: Number(f.instalmentsCompleted) || 0, endDate: f.endDate || null })
      }}>
      <Field label="Fund" className="full">{(id) => <Select id={id} required value={f.fundId} onChange={set('fundId')}>{funds.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}</Field>
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" min="1" step="any" required value={f.amount} onChange={set('amount')} />}</Field>
      <Field label="Frequency">{(id) => <Select id={id} value={f.frequency} onChange={set('frequency')}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></Select>}</Field>
      <Field label="Debit day of month">{(id) => <Input id={id} type="number" min="1" max="31" value={f.debitDay} onChange={set('debitDay')} />}</Field>
      <Field label="Status">{(id) => <Select id={id} value={f.status} onChange={set('status')}><option value="active">Active</option><option value="paused">Paused</option><option value="stopped">Stopped</option><option value="completed">Completed</option></Select>}</Field>
      <Field label="Debit from account" hint="When you mark an instalment paid, this account is debited." className="full">{(id) => <Select id={id} value={f.accountId} onChange={set('accountId')}><option value="">Do not link</option>{data.bankAccounts.filter((a: any) => a.type !== 'cash').map((a: any) => <option key={a.id} value={a.id}>{a.nickname || a.bankName}</option>)}</Select>}</Field>
      <Field label="Start date">{(id) => <Input id={id} type="date" required value={f.startDate} onChange={set('startDate')} />}</Field>
      <Field label="End date (optional)">{(id) => <Input id={id} type="date" value={f.endDate} onChange={set('endDate')} />}</Field>
      <Field label="Total instalments">{(id) => <Input id={id} type="number" min="0" value={f.instalmentsTotal} onChange={set('instalmentsTotal')} />}</Field>
      <Field label="Instalments completed">{(id) => <Input id={id} type="number" min="0" value={f.instalmentsCompleted} onChange={set('instalmentsCompleted')} />}</Field>
    </FormDialog>
  )
}
