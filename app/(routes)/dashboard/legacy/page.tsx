'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Copy, KeyRound, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { uid } from '@/lib/wealth/db'
import { formatDate, humanize } from '@/lib/wealth/format'
import { STATE_LABELS, DEFAULTS } from '@/lib/legacy/stateMachine'
import { createEmergencyBundle, decryptJson } from '@/lib/vault/crypto'
import { getVaultSession } from '@/lib/vault/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Select } from '@/components/wealth/kit'
import { CopyButton, CopyValue } from '@/components/wealth/CopyButton'
import { cn } from '@/lib/utils'

const KINDS = [{ v: 'primary_nominee', l: 'Primary nominee' }, { v: 'secondary_nominee', l: 'Secondary nominee' }, { v: 'emergency_contact', l: 'Emergency contact' }, { v: 'trusted_family', l: 'Trusted family' }]
const PRESETS = [30, 60, 90, 180]
const kindLabel = (k: string) => KINDS.find((x) => x.v === k)?.l ?? k

interface Plan { enabled: boolean; inactivityDays: number; reminderLeadDays: number; confirmDays: number; graceDays: number; channels: { email: boolean; push: boolean; sms: boolean }; state: string; lastActiveAt: string; confirmDeadline?: string; graceEndsAt?: string; contacts: any[]; package: { notes: string; include: Record<string, boolean>; snapshot?: any }; vaultBundle: any; accessLog: any[] }

export default function LegacyPage() {
  const { ready, isDemo, db, data, netWorth } = useWealth()
  const [remote, setRemote] = useState<Plan | null>(null)
  const [dlg, setDlg] = useState<null | 'contact' | 'bundle'>(null)
  const [del, setDel] = useState<any>(null)
  const [link, setLink] = useState<string | null>(null)
  const [custom, setCustom] = useState(false)
  const [eak, setEak] = useState<string | null>(null)

  const loadRemote = useCallback(async () => { try { setRemote((await axios.get('/api/legacy-plan')).data.plan) } catch { setRemote(null) } }, [])
  useEffect(() => { if (ready && !isDemo) loadRemote() }, [ready, isDemo, loadRemote])

  const local = data.legacy[0]
  const plan: Plan | null = useMemo(() => {
    if (isDemo) {
      if (!local) return null
      return { enabled: !!local.enabled, inactivityDays: local.inactivityDays ?? 90, reminderLeadDays: local.reminderLeadDays ?? DEFAULTS.reminderLeadDays, confirmDays: local.confirmDays ?? DEFAULTS.confirmDays, graceDays: local.graceDays ?? DEFAULTS.graceDays, channels: { email: true, push: true, sms: false, ...(local.reminderChannels || {}) }, state: local.state || 'monitoring', lastActiveAt: local.lastActiveAt, contacts: local.contacts || [], package: { notes: local.package?.notes || '', include: local.package?.include || {}, snapshot: local.package?.snapshot }, vaultBundle: local.vaultBundle || null, accessLog: local.accessLog || [] }
    }
    return remote
  }, [isDemo, local, remote])

  const patch = async (p: Partial<Plan>) => {
    if (isDemo) {
      const { channels, ...rest } = p as any
      await db.legacy.update('legacy', { ...rest, ...(channels ? { reminderChannels: channels } : {}), ...(p.package ? { package: p.package } : {}) })
    } else {
      try { setRemote((await axios.put('/api/legacy-plan', p)).data.plan) } catch (e) { toast.error(axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Could not save') }
    }
  }
  const post = async (body: object) => { try { const r = await axios.post('/api/legacy-plan', body); if (r.data.plan) setRemote(r.data.plan); return r.data } catch (e) { toast.error(axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Request failed'); return null } }

  if (!ready || !plan) return <LoadingBlock className="h-64" />

  const daysInactive = Math.max(0, Math.floor((Date.now() - new Date(plan.lastActiveAt).getTime()) / 86400000))
  const timeline = [
    { d: Math.max(plan.inactivityDays - plan.reminderLeadDays, 1), t: 'Reminder emailed to you' },
    { d: plan.inactivityDays, t: 'Push + email asking you to confirm you are safe' },
    { d: plan.inactivityDays + plan.confirmDays, t: 'Trusted contacts notified (if you have not confirmed)' },
    { d: plan.inactivityDays + plan.confirmDays + plan.graceDays, t: 'Grace period ends; verified contacts may access what you authorised' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader description="Plan what your family can access if you can no longer respond. Nothing is shared unless you authorise it." />
      <div role="note" className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p><strong>Important:</strong> Inactivity is not proof of death or incapacity. This feature only notifies people you trust and shares information you chose. It does not replace a will, bank nominations or inheritance law. Passwords are never emailed or texted.</p>
      </div>

      <Panel title="Status" action={<label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={plan.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />Enable monitoring</label>}>
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Stage</dt><dd className="font-medium">{plan.enabled ? STATE_LABELS[plan.state as keyof typeof STATE_LABELS] ?? plan.state : 'Off'}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Last active</dt><dd>{formatDate(plan.lastActiveAt?.slice(0, 10))}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Days inactive</dt><dd>{daysInactive}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Notify at</dt><dd>{plan.inactivityDays} days</dd></div>
        </dl>
        {plan.enabled && plan.state !== 'monitoring' && <div className="mt-3"><Button onClick={async () => { if (isDemo) await db.legacy.update('legacy', { state: 'monitoring', lastActiveAt: new Date().toISOString() }); else await post({ action: 'confirm-safe' }); toast.success('Confirmed. Monitoring restarted.') }}>I&apos;m safe: cancel the process</Button></div>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Inactivity rules">
          <div className="space-y-4">
            <div><p className="mb-1.5 text-sm font-medium">Notify after</p><div className="flex flex-wrap gap-1.5" role="group" aria-label="Inactivity period">
              {PRESETS.map((d) => <button key={d} type="button" aria-pressed={!custom && plan.inactivityDays === d} onClick={() => { setCustom(false); patch({ inactivityDays: d }) }} className={cn('rounded-full border px-3 py-1 text-xs font-medium', !custom && plan.inactivityDays === d ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground')}>{d} days</button>)}
              <button type="button" aria-pressed={custom || !PRESETS.includes(plan.inactivityDays)} onClick={() => setCustom(true)} className={cn('rounded-full border px-3 py-1 text-xs font-medium', custom || !PRESETS.includes(plan.inactivityDays) ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground')}>Custom</button></div>
              {(custom || !PRESETS.includes(plan.inactivityDays)) && <Input aria-label="Custom inactivity days" type="number" min={7} max={730} className="mt-2 w-32" defaultValue={plan.inactivityDays} onBlur={(e) => patch({ inactivityDays: Math.min(730, Math.max(7, Number(e.target.value) || 90)) })} />}</div>
            <div className="grid items-start gap-3 sm:grid-cols-3">
              {([['reminderLeadDays', 'Reminder', 'days before', 1, 60], ['confirmDays', 'Confirm window', 'days to reply', 1, 60], ['graceDays', 'Grace period', 'days to wait', 1, 90]] as const).map(([k, l, unit, lo, hi]) => (
                <Field key={k} label={l} hint={unit}>{(id) => <Input id={id} type="number" min={lo} max={hi} defaultValue={plan[k]} onBlur={(e) => patch({ [k]: Math.min(hi, Math.max(lo, Number(e.target.value) || lo)) } as any)} />}</Field>))}
            </div>
            <fieldset><legend className="mb-1.5 text-sm font-medium">Notify you by</legend><div className="flex flex-wrap gap-4">
              {(['email', 'push', 'sms'] as const).map((c) => <label key={c} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={plan.channels[c]} onChange={(e) => patch({ channels: { ...plan.channels, [c]: e.target.checked } })} />{c === 'sms' ? 'SMS' : c}</label>)}</div>
              <p className="mt-1 text-xs text-muted-foreground">SMS and push only work if they are set up for this app. Email is always used as the fallback.</p></fieldset>
          </div>
        </Panel>
        <Panel title="What happens, step by step" description="Based on your settings">
          <ol className="space-y-3">{timeline.map((s, i) => <li key={i} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{i + 1}</span><span><span className="font-medium">Day {s.d}</span> · {s.t}</span></li>)}</ol>
          <p className="mt-3 text-xs text-muted-foreground">Any activity in the app, or pressing “I&apos;m safe”, cancels the process at any point before release.</p>
        </Panel>
      </div>

      <Panel title="Trusted contacts" description="Each person accepts and verifies their identity with a one-time code before they count." action={<Button size="sm" onClick={() => setDlg('contact')}><Plus className="mr-1 h-4 w-4" />Add contact</Button>}>
        {plan.contacts.length === 0 ? <Empty title="No contacts yet" /> : (
          <ul className="divide-y divide-border">{[...plan.contacts].sort((a, b) => a.priority - b.priority).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-0"><p className="font-medium">#{c.priority} {c.name} <span className="text-xs font-normal text-muted-foreground">· {kindLabel(c.kind)}{c.relationship ? ` · ${c.relationship}` : ''}</span></p><p className="text-xs text-muted-foreground"><CopyValue value={c.email} label="Email" />{c.mobile ? <> · <CopyValue value={c.mobile} label="Mobile" /></> : null}</p></div>
              <div className="flex items-center gap-2"><span className={cn('rounded-md px-2 py-1 text-xs', c.verified ? 'bg-success/15 text-success' : c.accepted ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground')}>{c.verified ? 'Verified' : c.accepted ? 'Accepted' : 'Invited'}</span>
                {!c.accepted && <Button size="sm" variant="outline" onClick={async () => { if (isDemo) { await db.legacy.update('legacy', { contacts: plan.contacts.map((x) => (x.id === c.id ? { ...x, accepted: true, verified: true } : x)) }); toast.success('Demo: contact accepted') } else { const r = await post({ action: 'resend-invite', contactId: c.id }); if (r) { setLink(r.inviteLink || null); toast.success(r.emailed ? 'Invitation re-sent' : 'New link created') } } }}>{isDemo ? 'Simulate accept' : 'Resend invite'}</Button>}
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Remove ${c.name}`} onClick={() => setDel(c)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
            </li>))}</ul>
        )}
      </Panel>
      {link && <Panel title="Invitation link" description="Email isn't configured, so share this link with the contact yourself."><div className="flex gap-2"><Input readOnly value={link} aria-label="Invitation link" /><Button variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success('Copied') }}><Copy className="h-4 w-4" /></Button></div></Panel>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Legacy information package" description="Instructions and a summary your contacts see after release. No passwords.">
          <div className="space-y-3">
            <textarea aria-label="Notes for your family" rows={5} defaultValue={plan.package.notes} onBlur={(e) => patch({ package: { ...plan.package, notes: e.target.value } })} placeholder="Where documents are kept, who your CA / advisor is, FD and insurance locations…" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
            <div className="flex flex-wrap gap-4">{([['netWorth', 'Net worth summary'], ['accounts', 'Bank & fund list'], ['insurance', 'Insurance policies'], ['documents', 'Document list']] as const).map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={!!plan.package.include[k]} onChange={(e) => patch({ package: { ...plan.package, include: { ...plan.package.include, [k]: e.target.checked } } })} />{l}</label>)}</div>
            <Button variant="outline" size="sm" onClick={() => patch({ package: { ...plan.package, snapshot: { generatedAt: new Date().toISOString(), netWorth: netWorth.netWorth, assets: netWorth.assets, liabilities: netWorth.liabilities, banks: data.bankAccounts.map((b: any) => ({ bank: b.bankName, nickname: b.nickname, accountNumber: b.accountNumber })), funds: data.funds.map((f: any) => ({ name: f.name, folio: f.folio })), policies: data.policies.map((p: any) => ({ company: p.company, name: p.policyName, number: p.policyNumber, nominee: p.nominee })) } } })}>Refresh snapshot from my data</Button>
            <p className="text-xs text-muted-foreground">{plan.package.snapshot ? `Snapshot taken ${formatDate(plan.package.snapshot.generatedAt?.slice(0, 10))}` : 'No snapshot yet.'}</p>
          </div>
        </Panel>

        <Panel title="Vault emergency access" description="Authorise specific vault items. They are encrypted in your browser with a separate key you give your contact in person.">
          {isDemo ? <p className="text-sm text-muted-foreground">Available for real accounts. In demo, vault items stay in your browser only.</p> : plan.vaultBundle ? (
            <div className="space-y-3 text-sm"><p>{plan.vaultBundle.itemCount} item(s) shared with {plan.vaultBundle.grantedContactIds?.length || 0} contact(s), updated {formatDate(plan.vaultBundle.updatedAt?.slice(0, 10))}.</p>
              <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setDlg('bundle')}>Replace</Button><Button variant="outline" size="sm" onClick={async () => { await post({ action: 'revoke-bundle' }); toast.success('Emergency access revoked') }}>Revoke</Button></div></div>
          ) : <Button variant="outline" onClick={() => setDlg('bundle')}><KeyRound className="mr-2 h-4 w-4" />Set up emergency vault access</Button>}
          <p className="mt-3 text-xs text-muted-foreground">Contacts can only receive the encrypted bundle after the grace period and a one-time-code check, and can only read it with the Emergency Access Key. Family and admins never get automatic access.</p>
        </Panel>
      </div>

      <Panel title="Access log">
        {plan.accessLog.length === 0 ? <Empty title="No events yet" /> : <ul className="max-h-72 divide-y divide-border overflow-y-auto">{plan.accessLog.map((l: any, i: number) => <li key={i} className="flex justify-between gap-3 py-2 text-sm"><span><span className="font-medium">{humanize(l.action)}</span>{l.note ? ` · ${l.note}` : ''}<span className="block text-xs text-muted-foreground">by {l.by}</span></span><span className="shrink-0 text-xs text-muted-foreground">{formatDate(String(l.at).slice(0, 10))}</span></li>)}</ul>}
      </Panel>

      {dlg === 'contact' && <ContactForm count={plan.contacts.length} onClose={() => setDlg(null)} onSave={async (v) => {
        if (isDemo) await db.legacy.update('legacy', { contacts: [...plan.contacts, { id: uid('lc'), ...v, accepted: false, verified: false }] })
        else { const r = await post({ action: 'add-contact', contact: v }); if (!r) throw new Error('Could not add contact'); setLink(r.inviteLink || null); toast.success(r.emailed ? 'Invitation emailed' : 'Contact added') }
      }} />}
      {eak && <FormDialog open onOpenChange={(o) => !o && setEak(null)} title="Save the Emergency Access Key" submitLabel="Done" onSubmit={async () => {}}><div className="full space-y-3"><p className="text-sm">Give this key to your contact in person or by a different channel than email. It is shown once and we cannot recover it.</p><code className="block select-all rounded-lg bg-muted p-3 text-center text-lg">{eak}</code><Button type="button" variant="outline" onClick={() => { navigator.clipboard.writeText(eak); toast.success('Copied') }}><Copy className="mr-2 h-4 w-4" />Copy</Button></div></FormDialog>}
      {dlg === 'bundle' && <BundleForm plan={plan} onKey={setEak} onClose={() => setDlg(null)} onSave={async (bundle, count, granted) => { const r = await post({ action: 'save-bundle', bundle, itemCount: count, grantedContactIds: granted }); if (!r) throw new Error('Could not save') }} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Remove ${del?.name}?`} confirmLabel="Remove" variant="destructive" onConfirm={async () => { if (isDemo) await db.legacy.update('legacy', { contacts: plan.contacts.filter((x) => x.id !== del.id) }); else await post({ action: 'remove-contact', contactId: del.id }); setDel(null) }} />
    </div>
  )
}

function ContactForm({ count, onClose, onSave }: { count: number; onClose: () => void; onSave: (v: any) => Promise<void> }) {
  const [f, setF] = useState({ name: '', email: '', mobile: '', relationship: '', kind: 'primary_nominee', priority: String(count + 1) })
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Add trusted contact" description="They receive an invitation to accept and verify their identity." submitLabel="Send invitation"
      onSubmit={async () => { if (f.mobile && !/^\+?[0-9 ()-]{8,16}$/.test(f.mobile)) throw new Error('Enter a valid mobile number'); await onSave({ ...f, priority: Number(f.priority) || 1 }) }}>
      <Field label="Name">{(id) => <Input id={id} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      <Field label="Email">{(id) => <Input id={id} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
      <Field label="Mobile (for SMS verification)">{(id) => <Input id={id} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} placeholder="+91…" />}</Field>
      <Field label="Relationship">{(id) => <Input id={id} value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} />}</Field>
      <Field label="Type">{(id) => <Select id={id} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</Select>}</Field>
      <Field label="Priority (1 = first)">{(id) => <Input id={id} type="number" min="1" max="10" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} />}</Field>
    </FormDialog>
  )
}

function BundleForm({ plan, onClose, onKey, onSave }: { plan: Plan; onClose: () => void; onKey: (k: string) => void; onSave: (b: { iv: string; ct: string }, count: number, granted: string[]) => Promise<void> }) {
  const session = getVaultSession()
  const [items, setItems] = useState<any[] | null>(null)
  const [pickedItems, setPickedItems] = useState<string[]>([])
  const [pickedContacts, setPickedContacts] = useState<string[]>([])
  const { db } = useWealth()
  useEffect(() => { (async () => { if (!session) return; const rows = await db.vaultItems.toArray(); const out: any[] = []; for (const r of rows) { try { out.push({ ...(await decryptJson(session.key, r)), id: r.id }) } catch { /* skip */ } } setItems(out) })() }, [session, db])

  if (!session) return <FormDialog open onOpenChange={(o) => !o && onClose()} title="Unlock your vault first" submitLabel="OK" onSubmit={async () => {}}><p className="full text-sm">Open <Link className="text-primary underline" href="/dashboard/vault">My Vault</Link>, unlock it, then return here (the vault key is only held in memory while unlocked).</p></FormDialog>
  const toggle = (arr: string[], set: (x: string[]) => void, id: string) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Emergency vault access" description="Only what you tick here can ever be released." submitLabel="Encrypt and save"
      onSubmit={async () => {
        if (!pickedItems.length || !pickedContacts.length) throw new Error('Choose at least one item and one contact')
        const chosen = (items || []).filter((i) => pickedItems.includes(i.id)).map(({ id: _id, ...rest }) => { void _id; return rest })
        const { bundle, accessKey } = await createEmergencyBundle(chosen)
        await onSave(bundle, chosen.length, pickedContacts)
        onKey(accessKey)
      }}>
      <fieldset className="full space-y-1.5"><legend className="text-sm font-medium">Vault items</legend>{items === null ? <p className="text-xs text-muted-foreground">Decrypting…</p> : items.length === 0 ? <p className="text-xs text-muted-foreground">Your vault is empty.</p> : items.map((i) => <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={pickedItems.includes(i.id)} onChange={() => toggle(pickedItems, setPickedItems, i.id)} />{i.name}<span className="text-xs text-muted-foreground">({i.category})</span></label>)}</fieldset>
      <fieldset className="full space-y-1.5"><legend className="text-sm font-medium">Who may receive it</legend>{plan.contacts.length === 0 ? <p className="text-xs text-muted-foreground">Add contacts first.</p> : plan.contacts.map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={pickedContacts.includes(c.id)} onChange={() => toggle(pickedContacts, setPickedContacts, c.id)} />{c.name}</label>)}</fieldset>
    </FormDialog>
  )
}
