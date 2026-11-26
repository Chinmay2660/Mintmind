'use client'

import { useMySharedSummary } from '@/components/family/useMySummary'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, ChevronRight, Copy, Lock, MoreVertical, Trash2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWealth } from '@/lib/wealth/WealthContext'
import { uid } from '@/lib/wealth/db'
import { familyTotals, visibleSummary } from '@/lib/family/visibility'
import { formatCompactINR, formatINR, formatPct } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CHART_PALETTE, Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Select, Stat, chartAxis, chartGrid, chartTooltipStyle } from '@/components/wealth/kit'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { InviteReady, JoinWithCode, demoInvite, type InviteInfo } from '@/components/family/InviteCodes'

const ROLES = [{ v: 'admin', l: 'Admin' }, { v: 'member', l: 'Member' }, { v: 'emergency_contact', l: 'Emergency Contact' }]
const roleLabel = (r: string) => ROLES.find((x) => x.v === r)?.l ?? r

interface VM { id: string; name: string; relation?: string; role: string; status: string; self: boolean; email?: string; permissions?: Record<string, boolean>; summary: any }

export default function FamilyPage() {
  const { ready, isDemo, db, data } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const [circle, setCircle] = useState<{ id: string; name: string; me: any; members: VM[] } | null | undefined>(undefined)
  const [dlg, setDlg] = useState<null | 'invite' | { del: VM }>(null)
  const [invite, setInvite] = useState<InviteInfo | null>(null)

  const lastSent = useRef({ body: '', at: 0 })
  // my own shareable summary, computed locally from my data
  const mine = useMySharedSummary()

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
        <Button onClick={() => api({ action: 'create', name: 'My Family' }, 'Circle created')}><UserPlus className="mr-2 h-4 w-4" />Create circle</Button>
        {!isDemo && <JoinWithCode onJoin={async (otp) => !!(await api({ action: 'accept-otp', otp }, 'You have joined the circle'))} />}</Panel></div>
    )
  }

  const admin = circle.me?.role === 'admin'
  // Admins first, then members, then emergency contacts; you first within a role; pending invites last
  const roleRank: Record<string, number> = { admin: 0, member: 1, emergency_contact: 2 }
  const sortedMembers = [...circle.members].sort((a, b) => Number(a.status === 'invited' || a.status === 'pending') - Number(b.status === 'invited' || b.status === 'pending') || (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9) || Number(b.self) - Number(a.self) || a.name.localeCompare(b.name))

  const setRole = async (m: VM, role: string) => {
    if (isDemo) await db.members.update(m.id, { role }); else await api({ action: 'update-member', memberId: m.id, role }, 'Role updated')
  }

  return (
    <div className="space-y-5">
      <PageHeader title={circle.name} primaryAction={admin ? { label: 'Invite member', onClick: () => setDlg('invite') } : undefined} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 border-b border-border pb-5">
        <Stat label="Family net worth" value={<Money value={totals.netWorth} />} hint={hidden ? `${hidden} member${hidden > 1 ? 's' : ''} not shared` : undefined} />
        <Stat label="Total assets" value={<Money value={totals.assets} />} />
        <Stat label="Total liabilities" value={<Money value={totals.liabilities} />} />
        <Stat label="Growth this month" value={growth == null ? '-' : formatPct(growth, 1)} hint="Weighted by net worth" />
      </div>
      {totals.jointDeduplicated > 0 && <p className="text-xs text-muted-foreground">Includes {formatINR(totals.jointDeduplicated)} of jointly owned assets counted only once.</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Net worth by member" className="lg:col-span-1">
          {chart.length === 0 ? <Empty title="Nothing shared yet" /> : (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="name" {...chartAxis} /><YAxis {...chartAxis} width={44} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
              <Tooltip {...chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number) => (privacyMode ? '••••' : formatINR(v))} />
              <Bar dataKey="netWorth" name="Net worth" radius={[4, 4, 0, 0]}>{chart.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
          )}
        </Panel>
        <Panel title="Members" className="lg:col-span-2">
          {/* one card per person: who they are and their role on top, what they share below, every action in one menu */}
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {sortedMembers.map((m) => {
              const s = m.summary
              const initials = m.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
              const canRemove = (admin && !m.self) || (m.self && circle.members.length > 1)
              const canInvite = (m.status === 'invited' || m.status === 'pending') && admin
              const hasMenu = (admin && !m.self) || !!m.email || canInvite || (m.status === 'invited' && isDemo) || canRemove
              return (
                <li key={m.id} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{initials}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{m.name}{m.self ? ' (you)' : ''}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.relation}{m.status === 'invited' ? ' · Invite pending' : ''}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{roleLabel(m.role)}</span>
                    {hasMenu && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label={`Actions for ${m.name}`}><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {admin && !m.self && (
                            <>
                              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Role</DropdownMenuLabel>
                              {ROLES.map((r) => (
                                <DropdownMenuItem key={r.v} className="cursor-pointer" onClick={() => setRole(m, r.v)}>
                                  <Check className={`mr-2 h-4 w-4 ${m.role === r.v ? '' : 'opacity-0'}`} aria-hidden />{r.l}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {m.email && <DropdownMenuItem className="cursor-pointer" onClick={async () => { try { await navigator.clipboard.writeText(m.email); toast.success('Email copied') } catch { toast.error('Could not copy') } }}><Copy className="mr-2 h-4 w-4" />Copy email</DropdownMenuItem>}
                          {canInvite && <DropdownMenuItem className="cursor-pointer" onClick={async () => { if (isDemo) { setInvite(demoInvite(m.id, m.name)); return } const r = await api({ action: 'refresh-invite', memberId: m.id }); if (r?.invite) setInvite({ ...r.invite, name: m.name }) }}><UserPlus className="mr-2 h-4 w-4" />Invite code and link</DropdownMenuItem>}
                          {m.status === 'invited' && isDemo && <DropdownMenuItem className="cursor-pointer" onClick={() => db.members.update(m.id, { status: 'active' })}><Check className="mr-2 h-4 w-4" />Simulate accept</DropdownMenuItem>}
                          {canRemove && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDlg({ del: m })}><Trash2 className="mr-2 h-4 w-4" />{m.self ? 'Leave circle' : 'Remove from circle'}</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  {m.status === 'active' && (s && s.netWorth !== undefined ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground">Net worth</p>
                      <p className="flex items-baseline gap-2 text-xl font-semibold tabular-nums"><Money value={s.netWorth} compact />{s.growthPct != null && <span className="text-xs font-medium text-muted-foreground">{formatPct(s.growthPct, 1)} this month</span>}</p>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        {s.bank !== undefined && <div className="min-w-0"><dt className="text-xs text-muted-foreground">Bank</dt><dd className="truncate font-medium tabular-nums"><Money value={s.bank} compact /></dd></div>}
                        {s.mutualFunds !== undefined && <div className="min-w-0"><dt className="text-xs text-muted-foreground">Funds</dt><dd className="truncate font-medium tabular-nums"><Money value={s.mutualFunds} compact /></dd></div>}
                        {s.insuranceCover !== undefined && <div className="min-w-0"><dt className="text-xs text-muted-foreground">Cover</dt><dd className="truncate font-medium tabular-nums"><Money value={s.insuranceCover} compact /></dd></div>}
                      </dl>
                    </div>
                  ) : <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden />Not shared with you</p>)}
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <Link href="/dashboard/settings?tab=family" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        <span><strong className="font-semibold">Sharing is set in Settings.</strong> Choose what everyone, or one person, can see of you, and preview it.</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>

      {invite && <InviteReady info={invite} onClose={() => setInvite(null)} onRefresh={async () => { if (isDemo) { setInvite(demoInvite(invite.memberId, invite.name)); return } const r = await api({ action: 'refresh-invite', memberId: invite.memberId }); if (r?.invite) setInvite({ ...r.invite, name: invite.name }) }} />}

      {dlg === 'invite' && <InviteForm onClose={() => setDlg(null)} onSave={async (v) => {
        if (isDemo) { const id = uid('fm'); await db.members.put({ id, ...v, status: 'pending', permissions: { netWorth: false, overview: false, bank: false, mutualFunds: false, insurance: false, documents: false, emergencyOnly: false }, summary: null }); setInvite(demoInvite(id, v.name)); toast.success('Code and link created') }
        else { const r = await api({ action: 'invite', ...v }); if (r) { if (r.invite) setInvite({ ...r.invite, name: v.name }); toast.success('Code and link created') } else throw new Error('Could not invite') }
      }} />}
      <ConfirmDialog open={typeof dlg === 'object' && dlg !== null} onOpenChange={(o) => !o && setDlg(null)} title={typeof dlg === 'object' && dlg?.del.self ? 'Leave this circle?' : `Remove ${typeof dlg === 'object' ? dlg?.del.name : ''}?`} description="They will no longer see or be seen in the circle." confirmLabel="Confirm" variant="destructive"
        onConfirm={async () => { const m = (dlg as { del: VM }).del; if (isDemo) await db.members.delete(m.id); else await api({ action: m.self ? 'leave' : 'remove-member', memberId: m.id }, 'Done'); setDlg(null); if (!isDemo && m.self) setCircle(null) }} />
    </div>
  )
}

function InviteForm({ onClose, onSave }: { onClose: () => void; onSave: (v: { name: string; relation: string; role: string }) => Promise<void> }) {
  const [f, setF] = useState({ name: '', relation: '', role: 'member' })
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Invite a family member" submitLabel="Create code and link" onSubmit={() => onSave(f)}>
      <Field label="Name">{(id) => <Input id={id} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      <Field label="Relationship">{(id) => <Input id={id} value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })} placeholder="Spouse, Parent, Sibling…" />}</Field>
      <Field label="Role">{(id) => <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.filter((r) => r.v !== 'admin').map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</Select>}</Field>
    </FormDialog>
  )
}
