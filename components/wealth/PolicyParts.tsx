'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { FieldSet } from '@/components/ui/layout'
import { DateInput } from '@/components/ui/pickers'
import { Checkbox } from '@/components/ui/checkbox'
import { toISO, istNow } from '@/lib/wealth/calc'
import { shortAccountName } from '@/lib/wealth/accountName'
import { POLICY_TYPES, PREMIUM_FREQUENCIES } from '@/lib/wealth/labels'
import { daysUntil } from '@/lib/wealth/selectors'
import { formatDate } from '@/lib/wealth/format'
import { Field, StepFormDialog, Select } from '@/components/wealth/kit'

/** The kind a policy is listed under: its type, or the name given when the type is Other. */
export const kindOf = (p: any) => (p.type === 'other' && p.typeName ? `other:${String(p.typeName).trim()}` : p.type)
export const typeLabel = (v: string) => (v.startsWith('other:') ? v.slice(6) : null) ?? POLICY_TYPES.find((t) => t.value === v)?.label ?? v


/** Premium status in words as well as colour: overdue, due soon, or the date. */
export function premiumStatus(p: any, today: Date) {
  const d = p.nextPremium ? daysUntil(p.nextPremium, today) : null
  const expired = !!p.endDate && p.endDate < toISO(today)
  if (expired) return { label: 'Expired', cls: 'bg-muted text-muted-foreground' }
  if (p.frequency === 'single' || d == null) return { label: 'Paid up', cls: 'bg-muted text-muted-foreground' }
  if (d < 0) return { label: `${-d}d overdue`, cls: 'bg-destructive/15 text-destructive' }
  if (d <= 7) return { label: `Due in ${d}d`, cls: 'bg-destructive/15 text-destructive' }
  if (d <= 30) return { label: `Due in ${d}d`, cls: 'bg-warning/20 text-[hsl(32_90%_28%)] dark:text-warning' }
  return { label: `Due ${formatDate(p.nextPremium)}`, cls: 'bg-muted text-muted-foreground' }
}


export function PolicyForm({ row, members, documents, accounts, onClose, onSave }: { row?: any; members: any[]; documents: any[]; accounts: any[]; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({ accountId: row?.accountId || '', type: row?.type || 'health', typeName: row?.typeName || '', company: row?.company || '', policyName: row?.policyName || '', policyNumber: row?.policyNumber || '', holder: row?.holder || '', nominee: row?.nominee || '', sumAssured: String(row?.sumAssured ?? ''), premium: String(row?.premium ?? ''), frequency: row?.frequency || 'yearly', startDate: row?.startDate || toISO(istNow()), endDate: row?.endDate || '', nextPremium: row?.nextPremium || '', documentId: row?.documentId || '', notes: row?.notes || '' })
  const [covered, setCovered] = useState<string[]>(row?.members || [])
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit policy' : 'Add policy'} wide
      onSubmit={async () => {
        if (f.type === 'other' && !f.typeName.trim()) throw new Error('Name the kind of insurance, for example Travel')
        if (!(Number(f.sumAssured) > 0)) throw new Error('Sum assured must be positive')
        if (!(Number(f.premium) >= 0)) throw new Error('Enter a valid premium')
        if (f.endDate && f.endDate < f.startDate) throw new Error('End date is before start date')
        await onSave({ ...row, ...f, typeName: f.type === 'other' ? f.typeName.trim() : '', sumAssured: Number(f.sumAssured), premium: Number(f.premium), nextPremium: f.nextPremium || null, endDate: f.endDate || null, documentId: f.documentId || null, accountId: f.accountId || null, members: covered })
      }}
      steps={[
        { title: 'The policy', description: 'Who issued it and how to identify it.', content: <>
          <Field label="Type">{(id) => <Select id={id} value={f.type} onChange={set('type')}>{POLICY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>}</Field>
          {f.type === 'other' && <Field label="Kind of insurance" hint="Your own name, such as Travel, Pet or Cyber. Policies with the same name are kept together.">{(id) => <Input id={id} required value={f.typeName} onChange={set('typeName')} placeholder="e.g. Travel" />}</Field>}
          <Field label="Insurance company">{(id) => <Input id={id} required value={f.company} onChange={set('company')} />}</Field>
          <Field label="Policy name">{(id) => <Input id={id} required value={f.policyName} onChange={set('policyName')} />}</Field>
          <Field label="Policy number">{(id) => <Input id={id} required value={f.policyNumber} onChange={set('policyNumber')} />}</Field>
        </> },
        { title: 'People', description: 'Who holds it, who receives it and who is covered.', content: <>
          <Field label="Policy holder">{(id) => <Input id={id} required value={f.holder} onChange={set('holder')} />}</Field>
          <Field label="Nominee">{(id) => <Input id={id} value={f.nominee} onChange={set('nominee')} />}</Field>
          <FieldSet legend="Covered family members" className="full">
        <div className="flex flex-wrap gap-3">{members.length === 0 && <span className="text-xs text-muted-foreground">Add members in Family Circle to map them here.</span>}{members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm"><Checkbox checked={covered.includes(m.name)} onChange={(e) => setCovered((c) => (e.target.checked ? [...c, m.name] : c.filter((x) => x !== m.name)))} />{m.name}</label>
        ))}</div></FieldSet>
        </> },
        { title: 'Cover and premium', description: 'How much it covers and what it costs.', content: <>
          <Field label="Sum assured (₹)">{(id) => <Input id={id} type="number" min="1" step="any" required value={f.sumAssured} onChange={set('sumAssured')} />}</Field>
          <Field label="Premium (₹)">{(id) => <Input id={id} type="number" min="0" step="any" required value={f.premium} onChange={set('premium')} />}</Field>
          <Field label="Premium frequency">{(id) => <Select id={id} value={f.frequency} onChange={set('frequency')}>{PREMIUM_FREQUENCIES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>}</Field>
          <Field label="Next premium date">{(id) => <DateInput id={id} value={f.nextPremium} onChange={set('nextPremium')} />}</Field>
          <Field label="Start date">{(id) => <DateInput id={id} required value={f.startDate} onChange={set('startDate')} />}</Field>
          <Field label="End / expiry date">{(id) => <DateInput id={id} value={f.endDate} onChange={set('endDate')} />}</Field>
        </> },
        { title: 'Links (optional)', description: 'Connect the policy to an account and its paperwork.', content: <>
          <Field label="Pay premium from" hint="Marking a premium paid debits this account." className="full">{(id) => <Select id={id} value={f.accountId} onChange={set('accountId')}><option value="">Do not link</option>{accounts.map((a) => <option key={a.id} value={a.id}>{shortAccountName(a, accounts)}</option>)}</Select>}</Field>
          <Field label="Attached document" className="full">{(id) => <Select id={id} value={f.documentId} onChange={set('documentId')}><option value="">None (upload under Documents first)</option>{documents.filter((d) => d.category === 'Insurance').concat(documents.filter((d) => d.category !== 'Insurance')).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
        </> },
      ]}
    />
  )
}
