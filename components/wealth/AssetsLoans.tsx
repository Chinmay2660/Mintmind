'use client'

import { weightedRate } from '@/lib/wealth/holdingsTotals'
import { SummaryHeader } from '@/components/wealth/HoldingUI'
import { TabBar } from '@/components/ui/tab-bar'
import { useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { toISO, istNow } from '@/lib/wealth/calc'
import { ASSET_LABELS, LIABILITY_LABELS, MANUAL_ASSET_CATEGORIES, MANUAL_LIABILITY_CATEGORIES } from '@/lib/wealth/labels'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from './Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, PageHeader, StepFormDialog, Select } from './kit'
import { AssetForm } from './AssetForm'

type Kind = 'asset' | 'liability'

/** Where EPF, PPF, FDs, gold, real estate and stocks (the Assets page) and loans (the Loans page) are added and updated. Bank, funds and cards have their own tabs. */
export function AssetsLoans({ view }: { view: 'loans' }) {
  const { data, db } = useWealth()
  const [edit, setEdit] = useState<null | { kind: Kind; row: any; category?: string }>(null)
  const [del, setDel] = useState<null | { kind: Kind; id: string; name: string }>(null)
  const [loanKind, setLoanKind] = useState('all') // All first, then a tab for each kind of loan you have
  useAddParam((what) => { if (what === 'asset' || what === 'liability') setEdit({ kind: what as Kind, row: null, category: what === 'asset' ? 'fd' : undefined }) })
  const table = (k: Kind) => (k === 'asset' ? 'assets' : 'liabilities')

  return (
    <div className="space-y-4">
      <PageHeader description="What you owe. Net worth is worked out from these." primaryAction={{ label: 'Add loan', onClick: () => setEdit({ kind: 'liability', row: null }) }} />
      {view === 'loans' && <section aria-label="Loans" className="space-y-3">
        {/* the page is already called Loans, so no extra box: the total, then the cards */}
        {data.liabilities.length > 0 && (() => {
          const L = data.liabilities as any[]
          const out = L.reduce((n, l) => n + (Number(l.outstanding) || 0), 0), emi = L.reduce((n, l) => n + (Number(l.emi) || 0), 0)
          const avg = weightedRate(L)
          return <SummaryHeader label="Total outstanding" value={<Money value={out} />} stats={[{ label: 'Monthly EMI', value: emi > 0 ? <Money value={emi} compact /> : '-' }, { label: 'Loans', value: L.length }, { label: 'Avg rate', value: avg != null ? `${avg.toFixed(2)}%` : '-' }]} />
        })()}
        {data.liabilities.length > 0 && (() => {
          const present = [...new Set<string>(data.liabilities.map((l: any) => l.category))]
          return present.length > 1 ? <TabBar label="Kinds of loan" value={present.includes(loanKind) ? loanKind : 'all'} onChange={setLoanKind} tabs={[{ key: 'all', label: 'All' }, ...present.map((k) => ({ key: k, label: LIABILITY_LABELS[k as keyof typeof LIABILITY_LABELS] ?? k }))]} /> : null
        })()}
        {data.liabilities.length === 0 ? <Empty title="No loans added" description="Add a home, car or personal loan, or a card balance you carry, and it is taken off your net worth." /> : (
          <ul className="grid gap-3 md:grid-cols-2">{data.liabilities.filter((l: any) => loanKind === 'all' || l.category === loanKind).map((l: any) => (
            <li key={l.id} className="flex min-w-0 flex-col rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{l.name}</p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{LIABILITY_LABELS[l.category as keyof typeof LIABILITY_LABELS] ?? l.category}{l.updated ? ` · Updated ${formatDate(l.updated)}` : ''}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${l.name}`} onClick={() => setEdit({ kind: 'liability', row: l })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete ${l.name}`} onClick={() => setDel({ kind: 'liability', id: l.id, name: l.name })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[{ label: 'Outstanding', value: <Money value={l.outstanding} compact /> }, { label: 'EMI', value: l.emi > 0 ? formatINR(l.emi) : '-' }, { label: 'Rate', value: l.rate > 0 ? `${l.rate}%` : '-' }].map((x, i) => (
                  <div key={x.label} className={i === 1 ? 'text-center' : i === 2 ? 'text-right' : ''}><p className="text-xs text-muted-foreground">{x.label}</p><p className="mt-0.5 whitespace-nowrap text-sm font-semibold tabular-nums">{x.value}</p></div>
                ))}
              </div>
            </li>))}</ul>
        )}
      </section>}
      {edit?.kind === 'asset' && <AssetForm row={edit.row} category={edit.category} onClose={() => setEdit(null)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success('Saved') }} />}
      {edit?.kind === 'liability' && <ItemForm kind={edit.kind} row={edit.row} onClose={() => setEdit(null)} onSave={async (rec) => { await save(db, table(edit.kind), rec); toast.success('Saved') }} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete ${del?.name}?`} description="It is removed from net worth, and from any goal it was linked to." confirmLabel="Delete" variant="destructive" onConfirm={async () => { if (del) await remove(db, table(del.kind), del.id); setDel(null); toast.success('Deleted') }} />
    </div>
  )
}

export function ItemForm({ kind, row, onClose, onSave }: { kind: Kind; row: any; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const isAsset = kind === 'asset'
  const [f, setF] = useState({ name: row?.name || '', category: row?.category || (isAsset ? 'epf' : 'homeLoan'), amount: String(isAsset ? row?.value ?? '' : row?.outstanding ?? ''), emi: String(row?.emi ?? ''), rate: String(row?.rate ?? ''), notes: row?.notes || '' })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={`${row ? 'Edit' : 'Add'} ${isAsset ? 'asset' : 'loan'}`}
      onSubmit={async () => {
        const amount = Number(f.amount)
        if (!(amount >= 0)) throw new Error('Enter a valid amount')
        await onSave(isAsset
          ? { ...row, name: f.name.trim(), category: f.category, value: amount, updated: toISO(istNow()), notes: f.notes }
          : { ...row, name: f.name.trim(), category: f.category, outstanding: amount, emi: Number(f.emi) || 0, rate: Number(f.rate) || 0, updated: toISO(istNow()), notes: f.notes })
      }}
      steps={[
        { title: isAsset ? 'The asset' : 'The loan', description: isAsset ? 'What it is called and what kind it is.' : 'What it is called and what kind of loan.', content: <>
      <Field label="Name">{(id) => <Input id={id} required value={f.name} onChange={set('name')} placeholder={isAsset ? 'e.g. EPF (Acme Technologies)' : 'e.g. Home loan - HDFC'} />}</Field>
      <Field label="Category">{(id) => (
        <Select id={id} value={f.category} onChange={set('category')}>
          {(isAsset ? MANUAL_ASSET_CATEGORIES : MANUAL_LIABILITY_CATEGORIES).map((c) => <option key={c} value={c}>{isAsset ? ASSET_LABELS[c as keyof typeof ASSET_LABELS] : LIABILITY_LABELS[c as keyof typeof LIABILITY_LABELS]}</option>)}
        </Select>)}</Field>
        </> },
        { title: isAsset ? 'Value' : 'Repayment', description: isAsset ? 'What it is worth today.' : 'What is still owed, the monthly EMI and the interest rate.', content: <>
      <Field label={isAsset ? 'Current value (₹)' : 'Outstanding (₹)'}>{(id) => <Input id={id} type="number" min="0" step="any" required value={f.amount} onChange={set('amount')} />}</Field>
      {!isAsset && <Field label="EMI (₹)">{(id) => <Input id={id} type="number" min="0" step="any" value={f.emi} onChange={set('emi')} />}</Field>}
      {!isAsset && <Field label="Interest rate (%)">{(id) => <Input id={id} type="number" min="0" step="any" value={f.rate} onChange={set('rate')} />}</Field>}
      <Field label="Notes" className="full">{(id) => <Input id={id} value={f.notes} onChange={set('notes')} />}</Field>
        </> },
      ]} />
  )
}
