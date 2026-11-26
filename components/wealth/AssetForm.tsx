'use client'

import { useState } from 'react'
import { toISO, istNow } from '@/lib/wealth/calc'
import { ASSET_LABELS, MANUAL_ASSET_CATEGORIES, VEHICLE_TYPES } from '@/lib/wealth/labels'
import { epfTotal, etfDetails, fdValue, goldValue, KARAT, rdValue } from '@/lib/wealth/holdings'
import { Input } from '@/components/ui/input'
import { DateInput, Field, Select, StepFormDialog } from './kit'

// how each kind reads in the title: acronyms stay in capitals
const TITLE_NOUN: Record<string, string> = { fd: 'fixed deposit', rd: 'recurring deposit', epf: 'EPF', gold: 'physical gold', etf: 'ETF', stocks: 'stocks', ppf: 'PPF', nps: 'NPS', esop: 'ESOP or RSU grant', realEstate: 'property', vehicle: 'vehicle', other: 'asset' }
const num = (v: string) => (v.trim() === '' ? 0 : Number(v))

/** The asset form. Each kind of asset asks for the details it really has: an FD its rate and dates, EPF its three balances, and so on. */
export function AssetForm({ row, category: startCategory, onClose, onSave }: { row: any; category?: string; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({
    name: row?.name || '', category: row?.category || startCategory || 'fd', notes: row?.notes || '',
    value: String(row?.value ?? ''),
    // fixed deposit and recurring deposit
    principal: String(row?.principal ?? ''), ratePct: String(row?.ratePct ?? ''), startDate: row?.startDate || '', maturityDate: row?.maturityDate || '',
    monthlyInstalment: String(row?.monthlyInstalment ?? ''), tenureMonths: String(row?.tenureMonths ?? ''),
    // EPF
    employeeShare: String(row?.employeeShare ?? ''), employerShare: String(row?.employerShare ?? ''), epsShare: String(row?.epsShare ?? ''),
    // gold
    grams: String(row?.grams ?? ''), karat: String(row?.karat ?? 24), paidAmount: String(row?.paidAmount ?? row?.invested ?? ''), rate24: String(row?.rate24 ?? ''),
    // ETF
    units: String(row?.units ?? ''), avgPrice: String(row?.avgPrice ?? ''), currentNav: String(row?.currentNav ?? ''), etfKind: row?.etfKind || 'Equity ETF',
    vehicleType: row?.vehicleType || 'Car',
    // property
    // what was paid or put in, for property, vehicles, stocks, PPF, NPS and other assets
    invested: String(row?.invested ?? row?.purchasePrice ?? ''),
  })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  const c = f.category
  const today = toISO(istNow())
  const input = (k: keyof typeof f, label: string, hint?: string, step = 'any') => (
    <Field label={label} hint={hint}>{(id) => <Input id={id} type="number" min="0" step={step} inputMode="decimal" value={f[k]} onChange={set(k)} />}</Field>
  )

  // live preview of what will be saved, from the same calculations the app uses everywhere
  const preview = (() => {
    const base = { category: c }
    if (c === 'fd') return fdValue({ ...base, principal: num(f.principal), ratePct: num(f.ratePct), startDate: f.startDate, maturityDate: f.maturityDate })
    if (c === 'rd') return rdValue({ ...base, monthlyInstalment: num(f.monthlyInstalment), ratePct: num(f.ratePct), startDate: f.startDate, tenureMonths: num(f.tenureMonths) })
    if (c === 'epf') return epfTotal({ employeeShare: num(f.employeeShare), employerShare: num(f.employerShare), epsShare: num(f.epsShare) })
    if (c === 'etf') return etfDetails({ units: num(f.units), avgPrice: num(f.avgPrice), currentNav: num(f.currentNav), value: num(f.value) }).value
    if (c === 'gold') return goldValue({ grams: num(f.grams), karat: num(f.karat), rate24: num(f.rate24) }) ?? (num(f.value) || num(f.paidAmount))
    return num(f.value)
  })()

  return (
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={`${row ? 'Edit' : 'Add'} ${TITLE_NOUN[c] ?? 'asset'}`} wide
      onSubmit={async () => {
        const name = f.name.trim()
        if (!name) throw new Error('Give it a name')
        const rec: any = { ...row, name, category: c, notes: f.notes, updated: today }
        if (c === 'fd') {
          if (!(num(f.principal) > 0)) throw new Error('Enter the amount you deposited')
          if (!f.startDate) throw new Error('Choose the start date')
          if (f.maturityDate && f.maturityDate < f.startDate) throw new Error('Maturity cannot be before the start date')
          Object.assign(rec, { principal: num(f.principal), ratePct: num(f.ratePct), startDate: f.startDate, maturityDate: f.maturityDate || '', manualValue: false })
        } else if (c === 'rd') {
          if (!(num(f.monthlyInstalment) > 0)) throw new Error('Enter the monthly instalment')
          if (!f.startDate) throw new Error('Choose the start date')
          if (!(num(f.tenureMonths) > 0)) throw new Error('Enter the tenure in months')
          Object.assign(rec, { monthlyInstalment: num(f.monthlyInstalment), ratePct: num(f.ratePct), startDate: f.startDate, tenureMonths: Math.round(num(f.tenureMonths)), manualValue: false })
        } else if (c === 'epf') {
          if (!(num(f.employeeShare) + num(f.employerShare) + num(f.epsShare) > 0)) throw new Error('Enter at least one balance')
          Object.assign(rec, { employeeShare: num(f.employeeShare), employerShare: num(f.employerShare), epsShare: num(f.epsShare), manualValue: false })
        } else if (c === 'gold') {
          if (!(num(f.grams) > 0)) throw new Error('Enter the weight in grams')
          const paid = num(f.paidAmount)
          Object.assign(rec, { grams: num(f.grams), karat: num(f.karat) || 24, paidAmount: paid, buyPricePerGram: paid > 0 ? Math.round((paid / num(f.grams)) * 100) / 100 : 0, rate24: num(f.rate24), manualValue: false })
        } else if (c === 'etf') {
          if (!(num(f.units) > 0)) throw new Error('Enter how many units you hold')
          if (!(num(f.avgPrice) > 0)) throw new Error('Enter the average price you paid per unit')
          Object.assign(rec, { units: num(f.units), avgPrice: num(f.avgPrice), currentNav: num(f.currentNav), etfKind: f.etfKind, manualValue: false })
        } else {
          if (!(num(f.value) >= 0) || f.value.trim() === '') throw new Error('Enter the current value')
          Object.assign(rec, { value: num(f.value) })
          rec.invested = num(f.invested)
          if (c === 'realEstate') rec.purchasePrice = num(f.invested)
          if (c === 'vehicle') rec.vehicleType = f.vehicleType
        }
        rec.value = Math.round(preview) // kept in step, so anything that reads the plain value stays right
        await onSave(rec)
      }}
      steps={[
        { title: "What it is", content: (<>
      <Field label="Type" className="full">{(id) => (
        <Select id={id} value={c} onChange={set('category')} disabled={!!row}>
          {MANUAL_ASSET_CATEGORIES.map((k) => <option key={k} value={k}>{ASSET_LABELS[k as keyof typeof ASSET_LABELS]}</option>)}
        </Select>)}</Field>
      <Field label="Name">{(id) => <Input id={id} required value={f.name} onChange={set('name')} placeholder={c === 'fd' ? 'e.g. HDFC FD 7.1%' : c === 'rd' ? 'e.g. SBI RD' : c === 'epf' ? 'e.g. EPF (Acme Technologies)' : c === 'gold' ? 'e.g. Wedding necklace' : c === 'etf' ? 'e.g. Nippon Gold BeES' : 'e.g. Name'} />}</Field>

        </>) },
        { title: "Details", content: (<>
      {c === 'fd' && <>
        {input('principal', 'Amount deposited (₹)')}
        {input('ratePct', 'Interest rate (%)', 'Compounded quarterly, as most banks do.')}
        <Field label="Start date">{(id) => <DateInput id={id} required value={f.startDate} onChange={set('startDate')} />}</Field>
        <Field label="Maturity date">{(id) => <DateInput id={id} min={f.startDate || undefined} value={f.maturityDate} onChange={set('maturityDate')} />}</Field>
      </>}

      {c === 'rd' && <>
        {input('monthlyInstalment', 'Monthly instalment (₹)')}
        {input('ratePct', 'Interest rate (%)', 'Compounded quarterly.')}
        <Field label="Start date">{(id) => <DateInput id={id} required value={f.startDate} onChange={set('startDate')} />}</Field>
        {input('tenureMonths', 'Tenure (months)', undefined, '1')}
      </>}

      {c === 'epf' && <>
        {input('employeeShare', 'Employee share (₹)', 'Your own contributions with interest.')}
        {input('employerShare', 'Employer share (₹)', 'Your employer\'s contributions with interest.')}
        {input('epsShare', 'EPS (₹)', 'The pension scheme balance, as your passbook shows it.')}
      </>}

      {c === 'gold' && <>
        {input('grams', 'Weight (grams)')}
        <Field label="Purity">{(id) => <Select id={id} value={f.karat} onChange={set('karat')}>{KARAT.map((k) => <option key={k} value={k}>{k}K</option>)}</Select>}</Field>
        {input('paidAmount', 'Purchase amount (₹)', 'The total you paid, including making charges.')}
        {input('rate24', '24K rate today (₹/g)', 'Optional. With it, the value follows the market rate and your purity.')}
        {!f.rate24 && input('value', 'Current value (₹)', 'Used when no rate is given. Leave empty to use the purchase amount.')}
      </>}

      {c === 'etf' && <>
        <Field label="Kind">{(id) => <Select id={id} value={f.etfKind} onChange={set('etfKind')}><option>Equity ETF</option><option>Gold ETF</option><option>Debt ETF</option><option>Other ETF</option></Select>}</Field>
        {input('units', 'Units held')}
        {input('avgPrice', 'Avg buy price (₹)', 'Your average cost per unit (price or NAV): total paid divided by units, across all your purchases.')}
        {input('currentNav', 'Current price (₹)', 'The latest price or NAV. Update it whenever you want the value refreshed.')}
      </>}

      {!['fd', 'rd', 'epf', 'gold', 'etf'].includes(c) && <>
        {c === 'vehicle' && <Field label="Vehicle type">{(id) => <Select id={id} value={f.vehicleType} onChange={set('vehicleType')}>{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>}
        {input('value', 'Current value (₹)')}
        {input('invested', ['stocks', 'ppf', 'nps'].includes(c) ? 'Amount invested (₹)' : 'Purchase amount (₹)', 'Optional. With it, the gain or loss is shown against the current value.')}
      </>}

      <Field label="Notes" className="full">{(id) => <Input id={id} value={f.notes} onChange={set('notes')} />}</Field>
      <p className="full rounded-lg bg-muted px-3 py-2 text-sm">Value today: <strong className="tabular-nums">₹{Math.round(preview).toLocaleString('en-IN')}</strong></p>
        </>) },
      ]} />
  )
}
