'use client'

import { shortAccountName } from '@/lib/wealth/accountName'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toISO, istNow } from '@/lib/wealth/calc'
import { Input } from '@/components/ui/input'
import { Field, FormDialog, Select, StepFormDialog } from './kit'
import { useWealth } from '@/lib/wealth/WealthContext'
import { DateInput } from '@/components/ui/pickers'
import { Money } from './Money'

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

export function FundForm({ row, folioOf, onClose, onSave }: { row?: any; folioOf?: any; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const base = row ?? folioOf // a new folio starts from the fund it belongs to
  const { data } = useWealth()
  const [f, setF] = useState({
    folio: row?.folio || '', units: String(row?.units ?? ''), purchaseNav: String(row?.purchaseNav ?? ''), notes: row?.notes || '',
  })
  // the scheme and its current NAV come from the public API, never from typing
  const [scheme, setScheme] = useState<{ schemeCode: string; name: string; fundHouse: string; category: string; nav: number; navDate: string | null } | null>(
    base?.schemeCode ? { schemeCode: String(base.schemeCode), name: base.name, fundHouse: base.fundHouse || '', category: base.category || '', nav: Number(base.currentNav) || 0, navDate: base.navDate || null } : null)
  const [pickError, setPickError] = useState('')
  const [picking, setPicking] = useState(false)
  const [changing, setChanging] = useState(!base)
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  const units = Number(f.units), pn = Number(f.purchaseNav)
  const invested = Math.round(units * pn * 100) / 100 // worked out from the units and the average NAV, never typed
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
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit folio' : folioOf ? 'Add folio' : 'Add mutual fund'} wide
      onSubmit={async () => {
        if (!scheme && !base) throw new Error('Search for the fund and pick it from the list')
        if (!(units > 0) || !(pn > 0)) throw new Error('Units and average purchase NAV must be positive')
        if (!/^[A-Za-z0-9/\- ]{3,30}$/.test(f.folio)) throw new Error('Enter a valid folio number')
        // the same fund in the same folio is one holding; a second folio of a fund is fine
        const code = scheme?.schemeCode ?? row?.schemeCode, name = String(scheme?.name ?? row?.name ?? '').trim().toLowerCase()
        if (data.funds.some((x: any) => x.id !== row?.id && (code ? String(x.schemeCode) === String(code) : String(x.name).trim().toLowerCase() === name) && String(x.folio).trim().toLowerCase() === f.folio.trim().toLowerCase())) throw new Error('This fund is already added with this folio number')
        const nav = scheme ? scheme.nav : Number(base?.currentNav) || 0
        const changed = !!scheme && (scheme.schemeCode !== row?.schemeCode || scheme.nav !== Number(row?.currentNav))
        const linked = scheme ? { schemeCode: scheme.schemeCode, name: scheme.name, fundHouse: scheme.fundHouse || row?.fundHouse || '', category: scheme.category || row?.category || '', navDate: scheme.navDate || row?.navDate, ...(changed ? { navFetchedAt: new Date().toISOString() } : {}) } : {}
        await onSave({ ...(folioOf ? { name: folioOf.name, fundHouse: folioOf.fundHouse, category: folioOf.category, navDate: folioOf.navDate, prevNav: folioOf.prevNav } : {}), ...row, ...f, ...linked, units, purchaseNav: pn, currentNav: nav, invested, currentValue: Math.round(units * nav * 100) / 100 })
      }}
      steps={[
        { title: "Fund", content: (<>
      {(scheme || folioOf) && !changing ? (
        <div className="full rounded-lg border border-border p-3">
          <p className="text-sm font-medium">{scheme?.name ?? folioOf.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Latest NAV ₹{scheme?.nav ?? folioOf.currentNav}{(scheme?.navDate ?? folioOf.navDate) ? ` on ${scheme?.navDate ?? folioOf.navDate}` : ''}.{scheme ? ' It updates by itself once a day.' : ''}</p>
          {!folioOf && <button type="button" className="mt-2 min-h-9 text-xs font-medium text-primary hover:underline" onClick={() => setChanging(true)}>Change fund</button>}
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
        </>) },
        { title: "Holding", content: (<>
      <Field label="Units held">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.units} onChange={set('units')} />}</Field>
      <Field label="Average purchase NAV (₹)">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.purchaseNav} onChange={set('purchaseNav')} />}</Field>
      <p className="full flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-sm"><span className="text-muted-foreground">Invested amount</span><span className="font-semibold tabular-nums">{invested > 0 ? <Money value={invested} /> : '-'}</span></p>
      <Field label="Notes" className="full">{(id) => <Input id={id} value={f.notes} onChange={set('notes')} />}</Field>
        </>) },
      ]} />
  )
}

/** Add funds to a holding: which folio, what kind of purchase, the NAV it was bought at and the units. The amount is units × NAV. */
export function InvestmentForm({ folios, onClose, onSave }: { folios: any[]; onClose: () => void; onSave: (v: { fundId: string; date: string; amount: number; nav: number; type: string }) => Promise<void> }) {
  const [f, setF] = useState({ fundId: folios[0].id, date: toISO(istNow()), type: 'lumpsum', nav: String(folios[0].currentNav || ''), units: '' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  const amount = Math.round(Number(f.units) * Number(f.nav) * 100) / 100
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Add funds"
      onSubmit={async () => { if (!(Number(f.units) > 0) || !(Number(f.nav) > 0)) throw new Error('Units and purchase NAV must be positive'); await onSave({ fundId: f.fundId, date: f.date, amount, nav: Number(f.nav), type: f.type }) }}>
      {folios.length > 1 && <Field label="Folio" className="full">{(id) => <Select id={id} value={f.fundId} onChange={set('fundId')}>{folios.map((x) => <option key={x.id} value={x.id}>{x.folio || 'No folio number'}</option>)}</Select>}</Field>}
      <Field label="Investment type">{(id) => <Select id={id} value={f.type} onChange={set('type')}><option value="lumpsum">Lumpsum</option><option value="sip">SIP instalment</option></Select>}</Field>
      <Field label="Date">{(id) => <DateInput id={id} required max={toISO(istNow())} value={f.date} onChange={set('date')} />}</Field>
      <Field label="Purchase NAV (₹)">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.nav} onChange={set('nav')} />}</Field>
      <Field label="Units held">{(id) => <Input id={id} type="number" step="any" min="0" required value={f.units} onChange={set('units')} />}</Field>
      <p className="full flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-sm"><span className="text-muted-foreground">Amount invested</span><span className="font-semibold tabular-nums">{amount > 0 ? <Money value={amount} /> : '-'}</span></p>
    </FormDialog>
  )
}

export function RedeemForm({ fund, onClose, onSave }: { fund: any; onClose: () => void; onSave: (v: { date: string; units: number; nav?: number; amount?: number }) => Promise<void> }) {
  const [f, setF] = useState({ date: toISO(istNow()), units: '', nav: String(fund.currentNav || ''), amount: '' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Record a sale" description={`You hold ${fund.units} units. The gain is worked out at your average cost.`}
      onSubmit={async () => { await onSave({ date: f.date, units: Number(f.units), nav: Number(f.nav) || undefined, amount: Number(f.amount) || undefined }) }}>
      <Field label="Date">{(id) => <DateInput id={id} required max={toISO(istNow())} value={f.date} onChange={set('date')} />}</Field>
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
    startDate: row?.startDate || toISO(istNow()), // kept behind the scenes: the next debit is counted from it
  })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit SIP' : 'Add SIP'} wide
      onSubmit={async () => {
        if (!f.fundId) throw new Error('Add a fund first')
        if (!(Number(f.amount) > 0)) throw new Error('SIP amount must be positive')
        const day = Number(f.debitDay)
        if (!(day >= 1 && day <= 31)) throw new Error('Debit day must be 1-31')
        await onSave({ ...row, ...f, accountId: f.accountId || null, amount: Number(f.amount), debitDay: day, status: row?.status || 'active', endDate: row?.endDate || null })
      }}>
      <Field label="Fund" className="full">{(id) => <Select id={id} required value={f.fundId} onChange={set('fundId')}>{funds.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}</Field>
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" min="1" step="any" required value={f.amount} onChange={set('amount')} />}</Field>
      <Field label="Frequency">{(id) => <Select id={id} value={f.frequency} onChange={set('frequency')}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></Select>}</Field>
      <Field label="Debit day of month">{(id) => <Input id={id} type="number" min="1" max="31" value={f.debitDay} onChange={set('debitDay')} />}</Field>
      <Field label="Debit from account" hint="When you mark an instalment paid, this account is debited." className="full">{(id) => <Select id={id} value={f.accountId} onChange={set('accountId')}><option value="">Do not link</option>{data.bankAccounts.filter((a: any) => a.type !== 'cash').map((a: any) => <option key={a.id} value={a.id}>{shortAccountName(a, data.bankAccounts)}</option>)}</Select>}</Field>
    </FormDialog>
  )
}
