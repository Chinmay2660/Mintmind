'use client'

import { SummaryHeader } from '@/components/wealth/HoldingUI'
import { BackBar } from '@/components/shell/BackBar'
import { useRouter } from 'next/navigation'
import { toastProblem } from '@/lib/notify'
import { shortAccountName } from '@/lib/wealth/accountName'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Paperclip, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deletePolicy, recordPremiumPaid, save } from '@/lib/wealth/actions'
import { premiumPayable } from '@/lib/wealth/premium'
import { toISO, istNow } from '@/lib/wealth/calc'
import { POLICY_TYPES, PREMIUM_FREQUENCIES } from '@/lib/wealth/labels'
import { annualPremium, coverageTotals, daysUntil } from '@/lib/wealth/selectors'
import { formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, InfoTip, StepFormDialog, LoadingBlock, PageHeader, Select } from '@/components/wealth/kit'
import { CopyValue } from '@/components/wealth/CopyButton'
import { cn } from '@/lib/utils'
import { FieldSet } from '@/components/ui/layout'
import { DateInput } from '@/components/ui/pickers'
import { Checkbox } from '@/components/ui/checkbox'
import { TabBar } from '@/components/ui/tab-bar'

const typeLabel = (v: string) => POLICY_TYPES.find((t) => t.value === v)?.label ?? v

export default function InsurancePage() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const { ready, data, db } = useWealth()
  const [openType, setOpenType] = useState<string | null>(null) // the kind of policy that is open, showing its policies
  const [dlg, setDlg] = useState<null | { kind: 'edit' | 'del'; row?: any }>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const router = useRouter()
  const [fromLink, setFromLink] = useState(false) // opened straight to one policy (from the Overview): Back returns there
  useEffect(() => { const q = new URLSearchParams(window.location.search), id = q.get('policy'), type = q.get('type'); if (id) { setDetail(id); setFromLink(true) } else if (type) setOpenType(type) }, [])
  const closeDetail = () => { if (fromLink) router.back(); else setDetail(null) }
  const today = useMemo(() => istNow(), [])
  const cover = useMemo(() => coverageTotals(data.policies, today), [data.policies, today])
  useDetailCrumb(detail && !fromLink ? data.policies.find((x: any) => x.id === detail)?.policyName ?? null : null, () => setDetail(null))
  if (!ready) return <LoadingBlock className="h-64" />

  const annual = data.policies.reduce((s, p) => s + annualPremium(p), 0)
  // each kind of policy that exists, with the cover it gives; a kind opens to show its policies
  const typeCount = (t: string) => data.policies.filter((p: any) => p.type === t).length
  const kinds = POLICY_TYPES.filter((t) => typeCount(t.value) > 0)

  return (
    <div className="space-y-5">
      <PageHeader description="Coverage is protection, not wealth. It is never counted in your net worth." primaryAction={{ label: 'Add policy', onClick: () => setDlg({ kind: 'edit' }) }} />
      <SummaryHeader label="Total coverage" value={<Money value={cover.total} compact />}
        stats={[{ label: 'Active policies', value: cover.activeCount }, { label: 'Annual premium', value: <Money value={annual} compact /> }, ...Object.entries(cover.byType).slice(0, 1).map(([k, v]) => ({ label: `${typeLabel(k)} cover`, value: <Money value={v as number} compact /> }))]} />

      {!detail && (kinds.length === 0 ? <Empty title="No policies" action={<Button onClick={() => setDlg({ kind: 'edit' })}>Add policy</Button>} /> : (
        <ul className="divide-y divide-border border-y border-border" aria-label="Kinds of policy">
          {kinds.map((t) => {
            const isOpen = openType === t.value
            const policies = data.policies.filter((p: any) => p.type === t.value)
            return (
              <li key={t.value}>
                <button type="button" aria-expanded={isOpen} aria-controls={`policies-${t.value}`} onClick={() => setOpenType(isOpen ? null : t.value)} className="flex min-h-14 w-full items-center gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !isOpen && '-rotate-90')} aria-hidden />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{t.label}</span><span className="block text-xs text-muted-foreground">{policies.length} {policies.length === 1 ? 'policy' : 'policies'}</span></span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums"><Money value={(cover.byType as Record<string, number>)[t.value] ?? 0} /></span>
                </button>
                {isOpen && (
                  <div id={`policies-${t.value}`} className="grid gap-3 pb-4 lg:grid-cols-2">
                    {policies.map((p: any) => <PolicyCard key={p.id} p={p} today={today} onOpen={() => setDetail(p.id)} />)}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ))}


      {detail && (() => { const p = data.policies.find((x: any) => x.id === detail); return p ? (
        <PolicyDetail p={p} today={today} doc={data.documents.find((x: any) => x.id === p.documentId)} history={data.premiums.filter((h: any) => h.policyId === p.id).sort((x: any, y: any) => y.date.localeCompare(x.date)).slice(0, 5)}
          onClose={closeDetail}
          onPaid={async () => { try { await recordPremiumPaid(db, p.id); toast.success('Premium recorded; next due date moved forward') } catch (e) { toastProblem(e, 'Could not record the premium') } }}
          onEdit={() => { setDetail(null); setDlg({ kind: 'edit', row: p }) }}
          onDelete={() => { setDetail(null); setDlg({ kind: 'del', row: p }) }} />
      ) : null })()}
      {dlg?.kind === 'edit' && <PolicyForm row={dlg.row} members={data.members} documents={data.documents} accounts={data.bankAccounts.filter((a: any) => a.type !== 'cash')} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'policies', r); toast.success('Policy saved') }} />}
      <ConfirmDialog open={dlg?.kind === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this policy?" description="Its premium history is removed too." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await deletePolicy(db, dlg!.row.id); setDlg(null); toast.success('Policy deleted') }} />
    </div>
  )
}

/** Premium status in words as well as colour: overdue, due soon, or the date. */
function premiumStatus(p: any, today: Date) {
  const d = p.nextPremium ? daysUntil(p.nextPremium, today) : null
  const expired = !!p.endDate && p.endDate < toISO(today)
  if (expired) return { label: 'Expired', cls: 'bg-muted text-muted-foreground' }
  if (p.frequency === 'single' || d == null) return { label: 'Paid up', cls: 'bg-muted text-muted-foreground' }
  if (d < 0) return { label: `${-d}d overdue`, cls: 'bg-destructive/15 text-destructive' }
  if (d <= 7) return { label: `Due in ${d}d`, cls: 'bg-destructive/15 text-destructive' }
  if (d <= 30) return { label: `Due in ${d}d`, cls: 'bg-warning/20 text-[hsl(32_90%_28%)] dark:text-warning' }
  return { label: `Due ${formatDate(p.nextPremium)}`, cls: 'bg-muted text-muted-foreground' }
}

/** Basics only: what it is, how much it covers, what it costs, and whether a premium needs attention. */
function PolicyCard({ p, today, onOpen }: { p: any; today: Date; onOpen: () => void }) {
  const st = premiumStatus(p, today)
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={`${p.policyName}, ${p.company}. Open details`}
      className="surface-card block w-full p-4 text-left outline-none transition-all hover:border-primary/40 hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-0.5">
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chart-4/15 text-chart-4"><ShieldCheck className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{p.policyName}</span>
          <span className="block truncate text-xs text-muted-foreground">{p.company} · {typeLabel(p.type)}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </span>
      <span className="mt-4 flex items-end justify-between gap-3">
        <span><span className="block text-xs text-muted-foreground">Sum assured</span><span className="block text-lg font-semibold tabular-nums"><Money value={p.sumAssured} /></span></span>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', st.cls)}>{st.label}</span>
      </span>
    </button>
  )
}

/** Everything else about one policy, on its own sheet with tabs. */
function PolicyDetail({ p, today, doc, history, onClose, onPaid, onEdit, onDelete }: { p: any; today: Date; doc?: any; history: any[]; onClose: () => void; onPaid: () => Promise<void>; onEdit: () => void; onDelete: () => void }) {
  const [tab, setTab] = useState<'details' | 'premium'>('details')
  const [busy, setBusy] = useState(false)
  const st = premiumStatus(p, today)
  const can = premiumPayable(p, today)
  const freq = PREMIUM_FREQUENCIES.find((x) => x.value === p.frequency)?.label
  const row = (k: string, children: React.ReactNode) => <div key={k} className="flex items-start justify-between gap-4 py-2.5 text-sm"><dt className="shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 text-right font-medium">{children}</dd></div>
  return (
    <section className="space-y-3">
      <BackBar onBack={onClose} />
      <div className="surface-card space-y-4 p-5">
        <div><h3 className="text-xl font-semibold">{p.policyName}</h3><p className="text-sm text-muted-foreground">{p.company} · {typeLabel(p.type)}</p></div>
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">Sum assured</p><p className="text-2xl font-semibold tabular-nums"><Money value={p.sumAssured} /></p></div>
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', st.cls)}>{st.label}</span>
        </div>
        <TabBar label="Policy details" className="-mx-5 md:mx-0" value={tab} onChange={(k) => setTab(k as typeof tab)} tabs={[{ key: 'details', label: 'Details' }, { key: 'premium', label: 'Premium' }]} />
        <div className="min-h-[17.5rem]">
          {tab === 'details' ? (
            <dl className="divide-y divide-border">
              {row("Policy number", <><CopyValue value={p.policyNumber} label="Policy number" mono /></>)}
              {row("Policy holder", <><CopyValue value={p.holder} label="Policy holder" /></>)}
              {row("Nominee", <><CopyValue value={p.nominee} label="Nominee" /></>)}
              {row("Period", <>{formatDate(p.startDate)} to {formatDate(p.endDate)}</>)}
              {row("Covers", <>{p.members?.length ? p.members.join(', ') : '-'}</>)}
              {row("Document", <><span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5 text-muted-foreground" />{doc ? doc.name : 'None attached'}</span></>)}
            </dl>
          ) : (
            <div className="space-y-3">
              <dl className="divide-y divide-border">
                {row("Premium", <><Money value={p.premium} /> <span className="text-xs font-normal text-muted-foreground">{freq}</span></>)}
                {row("Next premium", <>{p.nextPremium ? formatDate(p.nextPremium) : '-'}</>)}
              </dl>
              <p className="text-xs font-medium text-muted-foreground">Recent payments</p>
              {history.length === 0 ? <p className="text-sm text-muted-foreground">No premiums recorded yet.</p> : <ul className="divide-y divide-border rounded-xl border border-border text-sm">{history.map((h) => <li key={h.id} className="flex justify-between px-3 py-2.5"><span>{formatDate(h.date)}</span><Money value={h.amount} className="font-medium" /></li>)}</ul>}
            </div>
          )}
        </div>
        {p.frequency !== 'single' && (can.ok
          ? <Button className="h-11" disabled={busy} onClick={async () => { setBusy(true); try { await onPaid() } finally { setBusy(false) } }}>Mark premium paid</Button>
          : <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm"><span className="flex items-center gap-2 font-medium"><Check className="h-4 w-4 text-success" />{p.endDate && p.endDate < toISO(today) ? 'Policy ended' : 'Paid for this period'}</span><InfoTip label="Premium status">{can.reason}</InfoTip></div>)}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={onEdit}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
          <Button variant="destructive" className="h-11" onClick={onDelete}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
        </div>
      </div>
    </section>
  )
}

function PolicyForm({ row, members, documents, accounts, onClose, onSave }: { row?: any; members: any[]; documents: any[]; accounts: any[]; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const [f, setF] = useState({ accountId: row?.accountId || '', type: row?.type || 'health', company: row?.company || '', policyName: row?.policyName || '', policyNumber: row?.policyNumber || '', holder: row?.holder || '', nominee: row?.nominee || '', sumAssured: String(row?.sumAssured ?? ''), premium: String(row?.premium ?? ''), frequency: row?.frequency || 'yearly', startDate: row?.startDate || toISO(istNow()), endDate: row?.endDate || '', nextPremium: row?.nextPremium || '', documentId: row?.documentId || '', notes: row?.notes || '' })
  const [covered, setCovered] = useState<string[]>(row?.members || [])
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit policy' : 'Add policy'} wide
      onSubmit={async () => {
        if (!(Number(f.sumAssured) > 0)) throw new Error('Sum assured must be positive')
        if (!(Number(f.premium) >= 0)) throw new Error('Enter a valid premium')
        if (f.endDate && f.endDate < f.startDate) throw new Error('End date is before start date')
        await onSave({ ...row, ...f, sumAssured: Number(f.sumAssured), premium: Number(f.premium), nextPremium: f.nextPremium || null, endDate: f.endDate || null, documentId: f.documentId || null, accountId: f.accountId || null, members: covered })
      }}
      steps={[
        { title: 'The policy', description: 'Who issued it and how to identify it.', content: <>
          <Field label="Type">{(id) => <Select id={id} value={f.type} onChange={set('type')}>{POLICY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>}</Field>
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
