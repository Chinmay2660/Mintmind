'use client'

import { useMemo, useState } from 'react'
import { Paperclip, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deletePolicy, recordPremiumPaid, save } from '@/lib/wealth/actions'
import { toISO } from '@/lib/wealth/calc'
import { POLICY_TYPES, PREMIUM_FREQUENCIES } from '@/lib/wealth/labels'
import { annualPremium, coverageTotals, daysUntil } from '@/lib/wealth/selectors'
import { formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Select, Stat } from '@/components/wealth/kit'
import { CopyButton, CopyValue } from '@/components/wealth/CopyButton'
import { cn } from '@/lib/utils'

const typeLabel = (v: string) => POLICY_TYPES.find((t) => t.value === v)?.label ?? v

export default function InsurancePage() {
  const { ready, data, db } = useWealth()
  const [filter, setFilter] = useState('all')
  const [dlg, setDlg] = useState<null | { kind: 'edit' | 'del'; row?: any }>(null)
  const today = useMemo(() => new Date(), [])
  const cover = useMemo(() => coverageTotals(data.policies, today), [data.policies, today])
  if (!ready) return <LoadingBlock className="h-64" />

  const annual = data.policies.reduce((s, p) => s + annualPremium(p), 0)
  const list = data.policies.filter((p) => filter === 'all' || p.type === filter)
  const hist = [...data.premiums].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)

  return (
    <div className="space-y-5">
      <PageHeader description="Coverage is protection, not wealth. It is never counted in your net worth." actions={<Button onClick={() => setDlg({ kind: 'edit' })}><Plus className="mr-1.5 h-4 w-4" />Add policy</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total coverage" value={<Money value={cover.total} compact />} hint={`${cover.activeCount} active`} />
        <Stat label="Annual premium" value={<Money value={annual} />} />
        {Object.entries(cover.byType).slice(0, 2).map(([k, v]) => <Stat key={k} label={`${typeLabel(k)} cover`} value={<Money value={v} compact />} />)}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
        {[{ value: 'all', label: 'All' }, ...POLICY_TYPES].map((t) => (
          <button key={t.value} type="button" aria-pressed={filter === t.value} onClick={() => setFilter(t.value)} className={cn('rounded-full border px-3 py-1 text-xs font-medium', filter === t.value ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{t.label}</button>
        ))}
      </div>

      {list.length === 0 ? <Empty title="No policies" action={<Button onClick={() => setDlg({ kind: 'edit' })}>Add policy</Button>} /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((p) => {
            const d = p.nextPremium ? daysUntil(p.nextPremium, today) : null
            const expired = p.endDate && p.endDate < toISO(today)
            const doc = data.documents.find((x) => x.id === p.documentId)
            return (
              <div key={p.id} className="surface-card flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-medium">{p.policyName}</p><p className="text-xs text-muted-foreground">{p.company} · {typeLabel(p.type)}{expired ? ' · Expired' : ''}</p></div>
                  <div className="flex shrink-0"><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${p.policyName}`} onClick={() => setDlg({ kind: 'edit', row: p })}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete ${p.policyName}`} onClick={() => setDlg({ kind: 'del', row: p })}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                </div>
                <dl className="mb-3 mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Sum assured</dt><dd className="font-semibold"><Money value={p.sumAssured} /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Premium</dt><dd className="font-semibold"><Money value={p.premium} /> <span className="text-xs font-normal text-muted-foreground">{PREMIUM_FREQUENCIES.find((f) => f.value === p.frequency)?.label}</span></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Policy number</dt><dd className="text-xs"><CopyValue value={p.policyNumber} label="Policy number" mono /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Policy holder</dt><dd><CopyValue value={p.holder} label="Policy holder" /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Nominee</dt><dd><CopyValue value={p.nominee} label="Nominee" /></dd></div>
                  <div><dt className="text-xs text-muted-foreground">Period</dt><dd>{formatDate(p.startDate)} - {formatDate(p.endDate)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Next premium</dt><dd className={d != null && d <= 7 ? 'font-medium text-destructive' : d != null && d <= 30 ? 'font-medium text-warning' : ''}>{p.nextPremium ? `${formatDate(p.nextPremium)} (${d! < 0 ? `${-d!}d overdue` : `${d}d`})` : '—'}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-muted-foreground">Covers</dt><dd className="text-sm">{p.members?.length ? p.members.join(', ') : '—'}</dd></div>
                </dl>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="h-3.5 w-3.5" />{doc ? doc.name : 'No document attached'}</span>
                  {p.frequency !== 'single' && <Button size="sm" variant="outline" onClick={async () => { await recordPremiumPaid(db, p.id); toast.success('Premium recorded; next due date moved forward') }}>Mark premium paid</Button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Panel title="Premium payment history">
        {hist.length === 0 ? <Empty title="No premiums recorded" /> : <ul className="divide-y divide-border">{hist.map((h) => <li key={h.id} className="flex justify-between py-2.5 text-sm"><span>{data.policies.find((p) => p.id === h.policyId)?.policyName ?? 'Policy'}<span className="block text-xs text-muted-foreground">{formatDate(h.date)}</span></span><Money value={h.amount} className="font-medium" /></li>)}</ul>}
      </Panel>

      {dlg?.kind === 'edit' && <PolicyForm row={dlg.row} members={data.members} documents={data.documents} accounts={data.bankAccounts.filter((a: any) => a.type !== 'cash')} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'policies', r); toast.success('Policy saved') }} />}
      <ConfirmDialog open={dlg?.kind === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this policy?" description="Its premium history is removed too." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await deletePolicy(db, dlg!.row.id); setDlg(null); toast.success('Policy deleted') }} />
    </div>
  )
}

function PolicyForm({ row, members, documents, accounts, onClose, onSave }: { row?: any; members: any[]; documents: any[]; accounts: any[]; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({ accountId: row?.accountId || '', type: row?.type || 'health', company: row?.company || '', policyName: row?.policyName || '', policyNumber: row?.policyNumber || '', holder: row?.holder || '', nominee: row?.nominee || '', sumAssured: String(row?.sumAssured ?? ''), premium: String(row?.premium ?? ''), frequency: row?.frequency || 'yearly', startDate: row?.startDate || toISO(new Date()), endDate: row?.endDate || '', nextPremium: row?.nextPremium || '', documentId: row?.documentId || '', notes: row?.notes || '' })
  const [covered, setCovered] = useState<string[]>(row?.members || [])
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit policy' : 'Add policy'} wide
      onSubmit={async () => {
        if (!(Number(f.sumAssured) > 0)) throw new Error('Sum assured must be positive')
        if (!(Number(f.premium) >= 0)) throw new Error('Enter a valid premium')
        if (f.endDate && f.endDate < f.startDate) throw new Error('End date is before start date')
        await onSave({ ...row, ...f, sumAssured: Number(f.sumAssured), premium: Number(f.premium), nextPremium: f.nextPremium || null, endDate: f.endDate || null, documentId: f.documentId || null, accountId: f.accountId || null, members: covered })
      }}>
      <Field label="Type">{(id) => <Select id={id} value={f.type} onChange={set('type')}>{POLICY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>}</Field>
      <Field label="Insurance company">{(id) => <Input id={id} required value={f.company} onChange={set('company')} />}</Field>
      <Field label="Policy name">{(id) => <Input id={id} required value={f.policyName} onChange={set('policyName')} />}</Field>
      <Field label="Policy number">{(id) => <Input id={id} required value={f.policyNumber} onChange={set('policyNumber')} />}</Field>
      <Field label="Policy holder">{(id) => <Input id={id} required value={f.holder} onChange={set('holder')} />}</Field>
      <Field label="Nominee">{(id) => <Input id={id} value={f.nominee} onChange={set('nominee')} />}</Field>
      <Field label="Sum assured (₹)">{(id) => <Input id={id} type="number" min="1" step="any" required value={f.sumAssured} onChange={set('sumAssured')} />}</Field>
      <Field label="Premium (₹)">{(id) => <Input id={id} type="number" min="0" step="any" required value={f.premium} onChange={set('premium')} />}</Field>
      <Field label="Premium frequency">{(id) => <Select id={id} value={f.frequency} onChange={set('frequency')}>{PREMIUM_FREQUENCIES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>}</Field>
      <Field label="Next premium date">{(id) => <Input id={id} type="date" value={f.nextPremium} onChange={set('nextPremium')} />}</Field>
      <Field label="Start date">{(id) => <Input id={id} type="date" required value={f.startDate} onChange={set('startDate')} />}</Field>
      <Field label="End / expiry date">{(id) => <Input id={id} type="date" value={f.endDate} onChange={set('endDate')} />}</Field>
      <Field label="Pay premium from" hint="Marking a premium paid debits this account." className="full">{(id) => <Select id={id} value={f.accountId} onChange={set('accountId')}><option value="">Do not link</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.nickname || a.bankName}</option>)}</Select>}</Field>
      <Field label="Attached document" className="full">{(id) => <Select id={id} value={f.documentId} onChange={set('documentId')}><option value="">None (upload under Documents first)</option>{documents.filter((d) => d.category === 'Insurance').concat(documents.filter((d) => d.category !== 'Insurance')).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
      <fieldset className="full space-y-2"><legend className="text-sm font-medium">Covered family members</legend>
        <div className="flex flex-wrap gap-3">{members.length === 0 && <span className="text-xs text-muted-foreground">Add members in Family Circle to map them here.</span>}{members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={covered.includes(m.name)} onChange={(e) => setCovered((c) => (e.target.checked ? [...c, m.name] : c.filter((x) => x !== m.name)))} />{m.name}</label>
        ))}</div></fieldset>
    </FormDialog>
  )
}
