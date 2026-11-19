'use client'

import { useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { toISO } from '@/lib/wealth/calc'
import { ASSET_LABELS, LIABILITY_LABELS, MANUAL_ASSET_CATEGORIES, MANUAL_LIABILITY_CATEGORIES } from '@/lib/wealth/labels'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from './Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, PageHeader, StepFormDialog, Panel, Select } from './kit'
import { PdfStatementImport } from '@/components/wealth/PdfStatementImport'
import { AssetSections } from './AssetSections'
import { AssetForm } from './AssetForm'

type Kind = 'asset' | 'liability'

/** Where EPF, PPF, FDs, gold, real estate and stocks (the Assets page) and loans (the Loans page) are added and updated. Bank, funds and cards have their own tabs. */
export function AssetsLoans({ view }: { view: 'assets' | 'loans' }) {
  const { data, db } = useWealth()
  const [edit, setEdit] = useState<null | { kind: Kind; row: any; category?: string }>(null)
  const [del, setDel] = useState<null | { kind: Kind; id: string; name: string }>(null)
  useAddParam((what) => { if (what === 'asset' || what === 'liability') setEdit({ kind: what as Kind, row: null, category: what === 'asset' ? 'fd' : undefined }) })
  const table = (k: Kind) => (k === 'asset' ? 'assets' : 'liabilities')

  return (
    <div className="space-y-4">
      {view === 'assets'
        ? <PageHeader description="What you own: deposits, EPF, gold, stocks, property and more. Net worth is worked out from these." actions={<PdfStatementImport label="Import PDF" />} primaryAction={{ label: 'Add asset', onClick: () => setEdit({ kind: 'asset', row: null, category: 'fd' }) }} />
        : <PageHeader description="What you owe. Net worth is worked out from these." primaryAction={{ label: 'Add loan', onClick: () => setEdit({ kind: 'liability', row: null }) }} />}
      {view === 'assets' && <AssetSections assets={data.assets} onAdd={(category) => setEdit({ kind: 'asset', row: null, category })} onEdit={(a) => setEdit({ kind: 'asset', row: a })} onDelete={(a) => setDel({ kind: 'asset', id: a.id, name: a.name })} />}
      {view === 'loans' && <Panel title="Loans" action={<span className="text-sm font-semibold tabular-nums"><Money value={data.liabilities.reduce((n: number, l: any) => n + (Number(l.outstanding) || 0), 0)} /></span>}>
        {data.liabilities.length === 0 ? <Empty title="No loans added" description="Add a home, car or personal loan, or a card balance you carry, and it is taken off your net worth." /> : (
          <ul className="grid gap-3 md:grid-cols-2">{data.liabilities.map((l: any) => (
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
              <div className="mt-3"><p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Outstanding</p><p className="text-2xl font-semibold tabular-nums"><Money value={l.outstanding} /></p></div>
              {(l.emi > 0 || l.rate > 0) && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3">
                  {l.emi > 0 && <div className="min-w-0"><dt className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">EMI</dt><dd className="mt-0.5 break-words text-sm font-medium tabular-nums">{formatINR(l.emi)}</dd></div>}
                  {l.rate > 0 && <div className="min-w-0"><dt className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Interest rate</dt><dd className="mt-0.5 break-words text-sm font-medium tabular-nums">{l.rate}%</dd></div>}
                </dl>
              )}
            </li>))}</ul>
        )}
      </Panel>}
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
          ? { ...row, name: f.name.trim(), category: f.category, value: amount, updated: toISO(new Date()), notes: f.notes }
          : { ...row, name: f.name.trim(), category: f.category, outstanding: amount, emi: Number(f.emi) || 0, rate: Number(f.rate) || 0, updated: toISO(new Date()), notes: f.notes })
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
