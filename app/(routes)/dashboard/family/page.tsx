'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Copy, Lock, Plus, Trash2, UserPlus } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { uid } from '@/lib/wealth/db'
import { growthVs, portfolioSummary } from '@/lib/wealth/calc'
import { coverageTotals } from '@/lib/wealth/selectors'
import { familyTotals, visibleSummary } from '@/lib/family/visibility'
import { formatCompactINR, formatINR, formatPct } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CHART_PALETTE, Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Select, Stat, chartAxis, chartGrid, chartTooltipStyle } from '@/components/wealth/kit'
import { CopyButton, CopyValue } from '@/components/wealth/CopyButton'
import { usePrivacyMode } from '@/contexts/PrivacyContext'

const ROLES = [{ v: 'admin', l: 'Admin' }, { v: 'member', l: 'Member' }, { v: 'emergency_contact', l: 'Emergency Contact' }]
const PERMS: [string, string, string][] = [
  ['netWorth', 'Total net worth', 'Assets, liabilities and growth'], ['overview', 'Overview', 'That I exist in the circle and my profile'], ['bank', 'Bank balances', 'Total savings balance'],
  ['mutualFunds', 'Mutual funds', 'Current portfolio value'], ['insurance', 'Insurance', 'Total coverage'], ['documents', 'Documents', 'Document list (never file contents)'],
  ['emergencyOnly', 'Emergency-only', 'Hide everything from the dashboard; share only through Digital Legacy'],
]
const roleLabel = (r: string) => ROLES.find((x) => x.v === r)?.l ?? r

interface VM { id: string; name: string; relation?: string; role: string; status: string; self: boolean; email?: string; permissions?: Record<string, boolean>; summary: any }

export default function FamilyPage() {
  const { ready, isDemo, db, data, netWorth } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [circle, setCircle] = useState<{ id: string; name: string; me: any; members: VM[] } | null | undefined>(undefined)
  const [dlg, setDlg] = useState<null | 'invite' | { del: VM }>(null)
  const [link, setLink] = useState<string | null>(null)

  const lastSent = useRef({ body: '', at: 0 })
  // my own shareable summary, computed locally from my data
  const mine = useMemo(() => {
    const today = new Date()
    const g = growthVs(data.snapshots, netWorth.netWorth, 1, today)
    const cover = coverageTotals(data.policies, today)
    return {
      assets: netWorth.assets, liabilities: netWorth.liabilities, netWorth: netWorth.netWorth, growthPct: g?.pct ?? null,
      bank: data.bankAccounts.reduce((s: number, b: any) => s + b.currentBalance, 0),
      mutualFunds: portfolioSummary(data.funds, data.fundTxns, data.sips, today).value, insuranceCover: cover.total,
      joint: data.bankAccounts.filter((b: any) => b.type === 'joint').map((b: any) => ({ key: `acct:${b.accountNumber}`, value: b.currentBalance })),
    }
  }, [data, netWorth])

  const load = useCallback(async () => {
    if (isDemo) {
      const rows = [...data.members]
      setCircle({ id: 'demo', name: 'Mehta Family', me: rows.find((m: any) => m.self), members: rows.map((m: any) => ({ id: m.id, name: m.name, relation: m.relation, role: m.role, status: m.status, self: !!m.self, email: m.email, permissions: m.permissions, summary: m.self ? mine : m.status === 'active' ? visibleSummary(m.summary, m.permissions) : null })) })
    } else {
      try { const r = await axios.get('/api/family-circle'); setCircle(r.data.circle) } catch { setCircle(null) }
    }
  }, [isDemo, data.members, mine])
  useEffect(() => { if (ready) load() }, [ready, load])

  // real users: publish my summary (server enforces who can see which fields)
  useEffect(() => {
    if (!ready || isDemo || !circle?.me) return
    const body = JSON.stringify(mine)
    if (body === lastSent.current.body) return
    const wait = Math.max(800, 30_000 - (Date.now() - lastSent.current.at))
    const t = setTimeout(() => {
      lastSent.current = { body, at: Date.now() }
      axios.post('/api/family-circle', { action: 'summary', summary: mine }).catch(() => {})
    }, wait)
    return () => clearTimeout(t)
  }, [ready, isDemo, circle?.me, mine])

  const api = async (body: object, ok?: string) => {
    try { const r = await axios.post('/api/family-circle', body); if (r.data.circle !== undefined) setCircle(r.data.circle); else await load(); if (ok) toast.success(ok); return r.data } catch (e) { toast.error(axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Request failed'); return null }
  }

  const rows = circle?.members.filter((m) => m.status === 'active') ?? []
  const totals = useMemo(() => familyTotals(rows.map((m) => (m.summary && m.summary.netWorth !== undefined ? m.summary : null))), [rows])
  const hidden = rows.filter((m) => !m.summary || m.summary.netWorth === undefined).length
  const withGrowth = rows.filter((m) => m.summary?.growthPct != null && m.summary.netWorth)
  const growth = withGrowth.length ? withGrowth.reduce((s, m) => s + m.summary.growthPct * m.summary.netWorth, 0) / withGrowth.reduce((s, m) => s + m.summary.netWorth, 0) : null
  const chart = rows.filter((m) => m.summary?.netWorth !== undefined).map((m) => ({ name: m.name.split(' ')[0], netWorth: m.summary.netWorth }))

  if (!ready || circle === undefined) return <LoadingBlock className="h-64" />

  if (circle === null) {
    return (
      <div className="mx-auto max-w-lg"><Panel title="Create your Family Circle">
        <Button onClick={() => api({ action: 'create', name: 'My Family' }, 'Circle created')}><UserPlus className="mr-2 h-4 w-4" />Create circle</Button></Panel></div>
    )
  }

  const admin = circle.me?.role === 'admin'
  // Admins first, then members, then emergency contacts; you first within a role; pending invites last
  const roleRank: Record<string, number> = { admin: 0, member: 1, emergency_contact: 2 }
  const sortedMembers = [...circle.members].sort((a, b) => Number(a.status === 'invited' || a.status === 'pending') - Number(b.status === 'invited' || b.status === 'pending') || (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9) || Number(b.self) - Number(a.self) || a.name.localeCompare(b.name))
  const self = circle.members.find((m) => m.self)

  const setSharing = async (key: string, value: boolean) => {
    if (!self?.permissions) return
    const permissions = { ...self.permissions, [key]: value }
    if (isDemo) await db.members.update(self.id, { permissions })
    else await api({ action: 'update-sharing', permissions })
  }
  const setRole = async (m: VM, role: string) => {
    if (isDemo) await db.members.update(m.id, { role }); else await api({ action: 'update-member', memberId: m.id, role }, 'Role updated')
  }

  return (
    <div className="space-y-5">
      <PageHeader title={circle.name} actions={admin ? <Button onClick={() => setDlg('invite')}><Plus className="mr-1.5 h-4 w-4" />Invite member</Button> : undefined} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Family net worth" value={<Money value={totals.netWorth} />} hint={hidden ? `${hidden} member${hidden > 1 ? 's' : ''} not shared` : undefined} />
        <Stat label="Total assets" value={<Money value={totals.assets} />} />
        <Stat label="Total liabilities" value={<Money value={totals.liabilities} />} />
        <Stat label="Growth this month" value={growth == null ? '—' : formatPct(growth, 1)} hint="Weighted by net worth" />
      </div>
      {totals.jointDeduplicated > 0 && <p className="text-xs text-muted-foreground">Includes {formatINR(totals.jointDeduplicated)} of jointly owned assets counted only once.</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Net worth by member" className="lg:col-span-1">
          {chart.length === 0 ? <Empty title="Nothing shared yet" /> : (
            <div className="h-56" role="img" aria-label="Net worth per member"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="name" {...chartAxis} /><YAxis {...chartAxis} width={44} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
              <Tooltip {...chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number) => (privacyMode ? '••••' : formatINR(v))} />
              <Bar dataKey="netWorth" name="Net worth" radius={[4, 4, 0, 0]}>{chart.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
          )}
        </Panel>
        <Panel title="Members" className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {sortedMembers.map((m) => {
              const s = m.summary
              return (
                <li key={m.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-medium">{m.name}{m.self ? ' (you)' : ''}</p><p className="text-xs text-muted-foreground">{m.relation}{m.email ? <> · <CopyValue value={m.email} label="Email" /></> : null}{m.status === 'invited' ? ' · Invite pending' : ''}</p></div>
                    <div className="flex items-center gap-1.5">
                      {admin && !m.self ? <Select aria-label={`Role for ${m.name}`} className="h-8 w-auto text-xs" value={m.role} onChange={(e) => setRole(m, e.target.value)}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</Select> : <span className="rounded-md bg-muted px-2 py-1 text-xs">{roleLabel(m.role)}</span>}
                      {m.status === 'invited' && isDemo && <Button size="sm" variant="outline" onClick={() => db.members.update(m.id, { status: 'active' })}>Simulate accept</Button>}
                      {(admin && !m.self || (m.self && circle.members.length > 1)) && <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={m.self ? 'Leave circle' : `Remove ${m.name}`} onClick={() => setDlg({ del: m })}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                  {m.status === 'active' && (s && s.netWorth !== undefined ? (
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                      <div><dt className="text-xs text-muted-foreground">Net worth</dt><dd className="font-medium"><Money value={s.netWorth} compact /></dd></div>
                      {s.bank !== undefined && <div><dt className="text-xs text-muted-foreground">Bank</dt><dd><Money value={s.bank} compact /></dd></div>}
                      {s.mutualFunds !== undefined && <div><dt className="text-xs text-muted-foreground">Mutual funds</dt><dd><Money value={s.mutualFunds} compact /></dd></div>}
                      {s.insuranceCover !== undefined && <div><dt className="text-xs text-muted-foreground">Insurance cover</dt><dd><Money value={s.insuranceCover} compact /></dd></div>}
                      {s.growthPct != null && <div><dt className="text-xs text-muted-foreground">Growth</dt><dd>{formatPct(s.growthPct, 1)}</dd></div>}
                    </dl>
                  ) : <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Not shared with you</p>)}
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      {self?.permissions && (
        <Panel title="My sharing">
          <ul className="grid gap-3 sm:grid-cols-2">{PERMS.map(([k, l, d]) => (
            <li key={k}><label className="flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={!!self.permissions![k]} onChange={(e) => setSharing(k, e.target.checked)} /><span><span className="block font-medium">{l}</span><span className="text-xs text-muted-foreground">{d}</span></span></label></li>
          ))}</ul>
        </Panel>
      )}

      {link && <Panel title="Invitation link" description="Email isn't configured, so share this link with the invitee yourself. It expires in 7 days."><div className="flex gap-2"><Input readOnly value={link} aria-label="Invitation link" /><Button variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success('Copied') }}><Copy className="h-4 w-4" /></Button></div></Panel>}

      {dlg === 'invite' && <InviteForm onClose={() => setDlg(null)} onSave={async (v) => {
        if (isDemo) { await db.members.put({ id: uid('fm'), ...v, status: 'pending', permissions: { netWorth: false, overview: false, bank: false, mutualFunds: false, insurance: false, documents: false, emergencyOnly: false }, summary: null }); toast.success('Invitation created (demo: no email is sent)') }
        else { const r = await api({ action: 'invite', ...v }); if (r) { setLink(r.inviteLink || null); toast.success(r.emailed ? 'Invitation emailed' : 'Invitation created') } else throw new Error('Could not invite') }
      }} />}
      <ConfirmDialog open={typeof dlg === 'object' && dlg !== null} onOpenChange={(o) => !o && setDlg(null)} title={typeof dlg === 'object' && dlg?.del.self ? 'Leave this circle?' : `Remove ${typeof dlg === 'object' ? dlg?.del.name : ''}?`} description="They will no longer see or be seen in the circle." confirmLabel="Confirm" variant="destructive"
        onConfirm={async () => { const m = (dlg as { del: VM }).del; if (isDemo) await db.members.delete(m.id); else await api({ action: m.self ? 'leave' : 'remove-member', memberId: m.id }, 'Done'); setDlg(null); if (!isDemo && m.self) setCircle(null) }} />
    </div>
  )
}

function InviteForm({ onClose, onSave }: { onClose: () => void; onSave: (v: { name: string; email: string; relation: string; role: string }) => Promise<void> }) {
  const [f, setF] = useState({ name: '', email: '', relation: '', role: 'member' })
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Invite a family member" submitLabel="Send invitation" onSubmit={() => onSave(f)}>
      <Field label="Name">{(id) => <Input id={id} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      <Field label="Email">{(id) => <Input id={id} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
      <Field label="Relationship">{(id) => <Input id={id} value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })} placeholder="Spouse, Parent, Sibling…" />}</Field>
      <Field label="Role">{(id) => <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</Select>}</Field>
    </FormDialog>
  )
}
