'use client'

import { shortAccountName } from '@/lib/wealth/accountName'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toISO } from '@/lib/wealth/calc'
import { Input } from '@/components/ui/input'
import { Field, FormDialog, Select, StepFormDialog } from './kit'
import { useWealth } from '@/lib/wealth/WealthContext'
import { DateInput } from '@/components/ui/pickers'

export const INVESTMENT_TYPES = ['Lumpsum', 'SIP', 'SIP + Lumpsum']

const MIN_LETTERS = 3
const DEBOUNCE_MS = 400
const searched = new Map<string, { schemeCode: string; schemeName: string }[]>() // the same words are never searched twice in a session

/** Search the public scheme list by name. Waits for a pause in typing, needs three letters, and drops an answer that is no longer wanted. */
function SchemeSearch({ onPick }: { onPick: (s: { schemeCode: string; schemeName: string }) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ schemeCode: string; schemeName: string }[]>([])
  const [state, setState] = useState<'idle' | 'waiting' | 'loading' | 'done' | 'error'>('idle')
  const ctl = useRef<AbortController | null>(null)
  useEffect(() => {
    const key = q.trim().toLowerCase()
    ctl.current?.abort()
    if (key.length < MIN_LETTERS) { setResults([]); setState('idle'); return }
    if (searched.has(key)) { setResults(searched.get(key)!); setState('done'); return }
    setState('waiting')
    const t = setTimeout(async () => {
      const c = new AbortController(); ctl.current = c
      setState('loading')
      try {
        const { data } = await axios.get('/api/mfapi/search', { params: { q: key }, signal: c.signal })
        searched.set(key, data); setResults(data); setState('done')
      } catch (e) { if (!axios.isCancel(e)) setState('error') }
    }, DEBOUNCE_MS)
    return () => { clearTimeout(t); ctl.current?.abort() }
  }, [q])
  return (
    <div className="full space-y-2">
      <Input aria-label="Search fund name" placeholder="Type at least 3 letters of the fund name, e.g. Axis small cap" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {state === 'waiting' || state === 'loading' ? 'Searching…' : state === 'error' ? 'Could not search right now. Try again in a moment.' : state === 'done' && !results.length ? 'No fund found. Try fewer or different words.' : ''}
      </p>
      {results.length > 0 && (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border" role="listbox" aria-label="Matching funds">
          {results.map((r) => (
            <li key={r.schemeCode} role="option" aria-selected={false}>
              <button type="button" onClick={() => onPick(r)} className="block min-h-11 w-full px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{r.schemeName}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function FundForm({ row, onClose, onSave }: { row?: any; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({
    folio: row?.folio || '', investmentType: row?.investmentType || 'Lumpsum',
    investmentDate: row?.investmentDate || toISO(new Date()), units: String(row?.units ?? ''), purchaseNav: String(row?.purchaseNav ?? ''),
    invested: String(row?.invested ?? ''), notes: row?.notes || '',
  })
  // the scheme and its current NAV come from the public API, never from typing
  const [scheme, setScheme] = useState<{ schemeCode: string; name: string; fundHouse: string; category: string; nav: number; navDate: string | null } | null>(
    row?.schemeCode ? { schemeCode: String(row.schemeCode), name: row.name, fundHouse: row.fundHouse || '', category: row.category || '', nav: Number(row.currentNav) || 0, navDate: row.navDate || null } : null)
  const [pickError, setPickError] = useState('')
  const [picking, setPicking] = useState(false)
  const [changing, setChanging] = useState(!row)
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  const pick = async (s: { schemeCode: string; schemeName: string }) => {
    setPicking(true); setPickError('')
    try {
      const { data } = await axios.get(`/api/mfapi/${encodeURIComponent(s.schemeCode)}`)
      if (!(data.nav > 0)) throw new Error('no nav')
      setScheme({ schemeCode: s.schemeCode, name: data.schemeName || s.schemeName, fundHouse: data.fundHouse || '', category: data.category || '', nav: data.nav, navDate: data.navDate })
      setChanging(false)
    } catch { setPickError('Could not get the latest NAV for this fund. Try again in a moment.') } finally { setPicking(false) }
  }
  return (
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit fund' : 'Add mutual fund'} wide
      onSubmit={async () => {
        if (!scheme && !row) throw new Error('Search for the fund and pick it from the list')
        const units = Number(f.units), pn = Number(f.purchaseNav)
        const invested = f.invested === '' ? units * pn : Number(f.invested)
        if (!(units > 0) || !(invested > 0)) throw new Error('Units and invested amount must be positive')
        if (!/^[A-Za-z0-9/\- ]{3,30}$/.test(f.folio)) throw new Error('Enter a valid folio number')
        const nav = scheme ? scheme.nav : Number(row?.currentNav) || 0
        const changed = !!scheme && (scheme.schemeCode !== row?.schemeCode || scheme.nav !== Number(row?.currentNav))
        const linked = scheme ? { schemeCode: scheme.schemeCode, name: scheme.name, fundHouse: scheme.fundHouse || row?.fundHouse || '', category: scheme.category || row?.category || '', navDate: scheme.navDate || row?.navDate, ...(changed ? { navFetchedAt: new Date().toISOString() } : {}) } : {}
        await onSave({ ...row, ...f, ...linked, units, purchaseNav: pn || invested / units, currentNav: nav, invested, currentValue: Math.round(units * nav * 100) / 100 })
      }}
      steps={[
        { title: "Fund", content: (<>
      {scheme && !changing ? (
        <div className="full rounded-lg border border-border p-3">
          <p className="text-sm font-medium">{scheme.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Latest NAV ₹{scheme.nav}{scheme.navDate ? ` on ${scheme.navDate}` : ''}. It updates by itself once a day.</p>
          <button type="button" className="mt-2 min-h-9 text-xs font-medium text-primary hover:underline" onClick={() => setChanging(true)}>Change fund</button>
        </div>
      ) : (
        <>
          {row && !scheme && <p className="full text-xs text-muted-foreground">{row.name} is not linked to a fund yet, so its NAV cannot update. Search for it to link it.</p>}
          <SchemeSearch onPick={pick} />
          {picking && <p className="full text-xs text-muted-foreground">Getting the latest NAV…</p>}
          {pickError && <p className="full text-xs text-destructive" role="alert">{pickError}</p>}
          {row && scheme && changing && <button type="button" className="full min-h-9 text-left text-xs font-medium text-primary hover:underline" onClick={() => setChanging(false)}>Keep as it is</button>}
        </>
      )}
      <Field label="Folio number">{(id) => <Input id={id} required value={f.folio} onChange={set('folio')} />}</Field>
      <Field label="Investment type">{(id) => <Select id={id} value={f.investmentType} onChange={set('investmentType')}>{INVESTMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
      <Field label="First investment date">{(id) => <DateInput id={id} required value={f.investmentDate} onChange={set('investmentDate')} />}</Field>
        </>) },
        { title: "Holding", content: (<>
      <Field label="Units held">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.units} onChange={set('units')} />}</Field>
      <Field label="Average purchase NAV">{(id) => <Input id={id} type="number" step="any" min="0" value={f.purchaseNav} onChange={set('purchaseNav')} />}</Field>
      <Field label="Invested amount (₹)">{(id) => <Input id={id} type="number" step="any" min="0" value={f.invested} onChange={set('invested')} placeholder="units × purchase NAV" />}</Field>
      <Field label="Notes">{(id) => <Input id={id} value={f.notes} onChange={set('notes')} />}</Field>
        </>) },
      ]} />
  )
}

export function InvestmentForm({ fund, onClose, onSave }: { fund: any; onClose: () => void; onSave: (v: { date: string; amount: number; nav: number; type: string }) => Promise<void> }) {
  const [f, setF] = useState({ date: toISO(new Date()), amount: '', nav: String(fund.currentNav || ''), type: 'lumpsum' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Add investment from statement"
      onSubmit={async () => { if (!(Number(f.amount) > 0) || !(Number(f.nav) > 0)) throw new Error('Amount and NAV must be positive'); await onSave({ date: f.date, amount: Number(f.amount), nav: Number(f.nav), type: f.type }) }}>
      <Field label="Date">{(id) => <DateInput id={id} required value={f.date} onChange={set('date')} />}</Field>
      <Field label="Type">{(id) => <Select id={id} value={f.type} onChange={set('type')}><option value="lumpsum">Lumpsum</option><option value="sip">SIP instalment</option></Select>}</Field>
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.amount} onChange={set('amount')} />}</Field>
      <Field label="NAV on that date">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.nav} onChange={set('nav')} />}</Field>
    </FormDialog>
  )
}

export function RedeemForm({ fund, onClose, onSave }: { fund: any; onClose: () => void; onSave: (v: { date: string; units: number; nav?: number; amount?: number }) => Promise<void> }) {
  const [f, setF] = useState({ date: toISO(new Date()), units: '', nav: String(fund.currentNav || ''), amount: '' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Record a sale" description={`You hold ${fund.units} units. The gain is worked out at your average cost.`}
      onSubmit={async () => { await onSave({ date: f.date, units: Number(f.units), nav: Number(f.nav) || undefined, amount: Number(f.amount) || undefined }) }}>
      <Field label="Date">{(id) => <DateInput id={id} required max={toISO(new Date())} value={f.date} onChange={set('date')} />}</Field>
      <Field label="Units sold">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.units} onChange={set('units')} />}</Field>
      <Field label="Sold at NAV (₹)" hint="Leave the amount empty to use units × NAV.">{(id) => <Input id={id} type="number" step="any" min="0" value={f.nav} onChange={set('nav')} />}</Field>
      <Field label="Amount received (₹, optional)">{(id) => <Input id={id} type="number" step="any" min="0" value={f.amount} onChange={set('amount')} />}</Field>
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
      <Field label="Debit from account" hint="When you mark an instalment paid, this account is debited." className="full">{(id) => <Select id={id} value={f.accountId} onChange={set('accountId')}><option value="">Do not link</option>{data.bankAccounts.filter((a: any) => a.type !== 'cash').map((a: any) => <option key={a.id} value={a.id}>{shortAccountName(a, data.bankAccounts)}</option>)}</Select>}</Field>
      <Field label="Start date">{(id) => <DateInput id={id} required value={f.startDate} onChange={set('startDate')} />}</Field>
      <Field label="End date (optional)">{(id) => <DateInput id={id} value={f.endDate} onChange={set('endDate')} />}</Field>
      <Field label="Total instalments">{(id) => <Input id={id} type="number" min="0" value={f.instalmentsTotal} onChange={set('instalmentsTotal')} />}</Field>
      <Field label="Instalments completed">{(id) => <Input id={id} type="number" min="0" value={f.instalmentsCompleted} onChange={set('instalmentsCompleted')} />}</Field>
    </FormDialog>
  )
}
