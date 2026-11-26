'use client'

import { useMemo, useState } from 'react'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { ArrowLeft, ChevronRight, Pencil, Target, Trash2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { emergencyTarget, GOAL_PRESETS, goalProgress, overAllocated } from '@/lib/wealth/goals'
import { buildFacts } from '@/lib/ai/facts'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from './Money'
import { assetValue } from '@/lib/wealth/holdings'
import { Button } from '@/components/ui/button'
import { TabBar } from '@/components/ui/tab-bar'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, StepFormDialog, PageHeader, Progress, Select } from './kit'
import { Checkbox } from '@/components/ui/checkbox'
import { DateInput } from '@/components/ui/pickers'

type GoalLink = { type: 'bank' | 'fund' | 'asset'; id: string; pct: number }

/** Goals: earmark existing accounts, funds and assets. Nothing is moved and net worth is unchanged. */
export function GoalsPanel() {
  const { data, db, netWorth } = useWealth()
  const [dlg, setDlg] = useState<null | { row?: any; del?: boolean }>(null)
  useAddParam((what) => { if (what === 'goal') setDlg({}) })
  const [detail, setDetail] = useState<string | null>(null)
  useDetailCrumb(detail ? data.goals.find((x: any) => x.id === detail)?.name ?? null : null, () => setDetail(null))
  const goals = data.goals
  const progress = useMemo(() => goals.map((g: any) => ({ g, p: goalProgress(g, data) })), [goals, data])
  const over = useMemo(() => overAllocated(goals), [goals])
  const suggested = useMemo(() => emergencyTarget(buildFacts({ ...data, netWorth }, new Date())), [data, netWorth])

  return (
    <div className="space-y-4">
      <PageHeader primaryAction={{ label: 'Add goal', onClick: () => setDlg({}) }} />
      {!detail && over.length > 0 && <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />Some linked items are earmarked for more than 100% across goals, so they are counted twice. Reduce their shares in the goals that use them.</p>}
      {!detail && (goals.length === 0 ? <Empty title="No goals yet" description="Create an Emergency fund or a Marriage fund and link the accounts or investments that back it." action={<Button onClick={() => setDlg({})}>Add goal</Button>} /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {progress.map(({ g, p }) => <GoalCard key={g.id} g={g} p={p} onOpen={() => setDetail(g.id)} />)}
        </div>
      ))}
      {detail && (() => { const x = progress.find((y) => y.g.id === detail); return x ? <GoalDetail g={x.g} p={x.p} onClose={() => setDetail(null)} onEdit={() => { setDetail(null); setDlg({ row: x.g }) }} onDelete={() => { setDetail(null); setDlg({ row: x.g, del: true }) }} /> : null })()}
      {dlg && !dlg.del && <GoalForm row={dlg.row} suggested={suggested} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'goals', r); toast.success('Goal saved') }} />}
      <ConfirmDialog open={!!dlg?.del} onOpenChange={(o) => !o && setDlg(null)} title={`Delete “${dlg?.row?.name}”?`} description="Only the goal is removed. The linked accounts and investments are untouched." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'goals', dlg!.row.id); setDlg(null); toast.success('Goal deleted') }} />
    </div>
  )
}

/** Summary only: name, progress, amounts. Tapping opens the goal's own detail sheet. */
function GoalCard({ g, p, onOpen }: { g: any; p: any; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={`${g.name}, ${p.achieved ? 'reached' : `${Math.round(p.pct)} percent`}. Open details`}
      className="surface-card block w-full p-4 text-left outline-none transition-all hover:border-primary/40 hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-0.5">
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{g.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{g.targetDate ? `By ${formatDate(g.targetDate)}` : 'No target date'}</span>
        </span>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', p.achieved ? 'bg-highlight/30 text-[hsl(85_60%_22%)] dark:bg-highlight/20 dark:text-highlight' : 'bg-muted')}>{p.achieved ? 'Done' : `${Math.round(p.pct)}%`}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </span>
      <span className="mt-4 block"><Progress value={p.pct} tone={p.achieved ? 'primary' : p.pct < 40 ? 'warning' : 'primary'} label={`${g.name} progress`} /></span>
      <span className="mt-2 block text-sm tabular-nums"><Money value={p.current} /> <span className="text-muted-foreground">of <Money value={p.target} /></span></span>
    </button>
  )
}

/** One goal in full, on its own sheet: tabs for the plan and for what backs it, with Edit and Delete as real buttons. */
function GoalDetail({ g, p, onClose, onEdit, onDelete }: { g: any; p: any; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const [tab, setTab] = useState<'overview' | 'linked'>('overview')
  return (
    <section className="space-y-3">
      <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" />All goals</button>
      <div className="surface-card space-y-4 p-5">
        <div><h3 className="text-xl font-semibold">{g.name}</h3><p className="text-sm text-muted-foreground">{g.targetDate ? `Target date ${formatDate(g.targetDate)}` : 'No target date'}</p></div>
        <div>
          <div className="flex items-baseline justify-between"><span className="text-2xl font-semibold tabular-nums"><Money value={p.current} /></span><span className="text-sm text-muted-foreground">of <Money value={p.target} /></span></div>
          <div className="mt-2"><Progress value={p.pct} tone={p.achieved ? 'primary' : p.pct < 40 ? 'warning' : 'primary'} label={`${g.name} progress`} /></div>
        </div>
        <TabBar label="Goal details" className="-mx-5 md:mx-0" value={tab} onChange={(k) => setTab(k as typeof tab)} tabs={[{ key: 'overview', label: 'Plan' }, { key: 'linked', label: `Linked (${p.links.length})` }]} />
        <div className="min-h-[12rem]">
        {tab === 'overview' ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">{p.achieved ? 'Status' : 'Still to go'}</dt><dd className="mt-0.5 font-semibold tabular-nums">{p.achieved ? 'Goal reached' : formatINR(p.remaining)}</dd></div>
            <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Progress</dt><dd className="mt-0.5 font-semibold tabular-nums">{Math.round(p.pct)}%</dd></div>
            <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Per month needed</dt><dd className="mt-0.5 font-semibold tabular-nums">{p.monthlyNeeded ? formatINR(p.monthlyNeeded) : 'Not set'}</dd></div>
            <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Time left</dt><dd className="mt-0.5 font-semibold tabular-nums">{p.monthsLeft != null ? `${p.monthsLeft} months` : 'No date'}</dd></div>
            {p.onTrackNote && <p className="col-span-2 text-sm text-muted-foreground">{p.onTrackNote}</p>}
          </dl>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border text-sm">
            {p.links.length === 0 ? <li className="px-3 py-4 text-muted-foreground">Nothing linked yet. Edit the goal to choose accounts or investments.</li> : p.links.map((l: any) => (
              <li key={`${l.type}:${l.id}`} className="flex items-center justify-between gap-3 px-3 py-3"><span className="min-w-0"><span className="block truncate">{l.name}</span><span className="text-xs text-muted-foreground">{l.pct}% counted</span></span><Money value={l.counted} className="shrink-0 font-medium tabular-nums" /></li>
            ))}
          </ul>
        )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={onEdit}><Pencil className="mr-1.5 h-4 w-4" />Edit goal</Button>
          <Button variant="destructive" className="h-11" onClick={onDelete}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
        </div>
      </div>
    </section>
  )
}

type Source = { type: GoalLink['type']; id: string; name: string; group: 'accounts' | 'funds' | 'other'; value: number }
const LINK_GROUPS: { key: Source['group']; label: string }[] = [{ key: 'accounts', label: 'Accounts' }, { key: 'funds', label: 'Funds' }, { key: 'other', label: 'Deposits & other' }]
const SEARCH_ABOVE = 6 // a short list needs no search box

/** Pick what backs a goal: a tab per kind, one row per item, and the share you count right on the row once it is ticked. */
function LinkPicker({ sources, links, onToggle, onShare }: { sources: Source[]; links: GoalLink[]; onToggle: (s: Source) => void; onShare: (s: Source, pct: number) => void }) {
  const [tab, setTab] = useState<Source['group']>(() => LINK_GROUPS.find((g) => sources.some((s) => s.group === g.key && links.some((l) => l.type === s.type && l.id === s.id)))?.key ?? 'accounts')
  const [q, setQ] = useState('')
  const linked = (s: Source) => links.find((l) => l.type === s.type && l.id === s.id)
  const counted = links.reduce((n, l) => { const s = sources.find((x) => x.type === l.type && x.id === l.id); return n + (s ? (s.value * (Number(l.pct) || 0)) / 100 : 0) }, 0)
  const inTab = sources.filter((s) => s.group === tab)
  const rows = inTab.filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="full space-y-3">
      <p className="text-sm" aria-live="polite">
        {links.length ? <><strong className="font-semibold">{links.length} linked</strong> <span className="text-muted-foreground">· {formatINR(Math.round(counted))} counts towards this goal. Nothing is moved.</span></> : <span className="text-muted-foreground">Tick what backs this goal. Nothing is moved.</span>}
      </p>
      <TabBar label="Kinds of holding" value={tab} onChange={(k) => { setTab(k as Source['group']); setQ('') }}
        tabs={LINK_GROUPS.map((g) => ({ key: g.key, label: g.label, badge: links.filter((l) => sources.some((s) => s.group === g.key && s.type === l.type && s.id === l.id)).length || undefined }))} />
      {inTab.length > SEARCH_ABOVE && <Input aria-label="Search this list" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />}
      {inTab.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Nothing here yet. Add one from its own page first.</p>
        : rows.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No match.</p>
        : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {rows.map((s) => {
              const l = linked(s)
              return (
                <li key={`${s.type}:${s.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <Checkbox checked={!!l} onChange={() => onToggle(s)} aria-label={`Link ${s.name}`} />
                    <span className="min-w-0"><span className="block truncate text-sm">{s.name}</span><span className="text-xs tabular-nums text-muted-foreground">{formatINR(s.value)}</span></span>
                  </label>
                  {l && <div className="w-24 shrink-0"><Select aria-label={`Share of ${s.name} that counts`} className="h-9 text-xs" value={l.pct} onChange={(e) => onShare(s, Number(e.target.value))}>{[100, 75, 50, 25].map((p) => <option key={p} value={p}>{p}%</option>)}</Select></div>}
                </li>
              )
            })}
          </ul>
        )}
    </div>
  )
}

function GoalForm({ row, suggested, onClose, onSave }: { row?: any; suggested: number; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const { data } = useWealth()
  const [f, setF] = useState({ name: row?.name || 'Emergency fund', target: String(row?.target ?? ''), targetDate: row?.targetDate || '', notes: row?.notes || '' })
  const [links, setLinks] = useState<GoalLink[]>(row?.links || [])
  const sources: Source[] = [
    ...data.bankAccounts.map((a: any) => ({ type: 'bank' as const, id: a.id, group: 'accounts' as const, name: `${a.nickname || a.bankName}${a.type === 'cash' ? ' (cash)' : ''}`, value: a.currentBalance })),
    ...data.funds.map((x: any) => ({ type: 'fund' as const, id: x.id, group: 'funds' as const, name: x.name, value: x.currentValue })),
    ...data.assets.map((x: any) => ({ type: 'asset' as const, id: x.id, group: 'other' as const, name: x.name, value: assetValue(x) })),
  ]
  const find = (s: { type: string; id: string }) => links.find((l) => l.type === s.type && l.id === s.id)
  const toggle = (s: { type: GoalLink['type']; id: string }) => setLinks((ls) => (find(s) ? ls.filter((l) => !(l.type === s.type && l.id === s.id)) : [...ls, { type: s.type, id: s.id, pct: 100 }]))
  const setPct = (s: { type: string; id: string }, pct: number) => setLinks((ls) => ls.map((l) => (l.type === s.type && l.id === s.id ? { ...l, pct } : l)))
  return (
    <StepFormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit goal' : 'Add goal'} wide
      onSubmit={async () => {
        const target = Number(f.target)
        if (!(target > 0)) throw new Error('Target amount must be positive')
        if (f.targetDate && f.targetDate < new Date().toISOString().slice(0, 10)) throw new Error('Target date must be in the future')
        await onSave({ ...row, id: row?.id, name: f.name.trim(), target, targetDate: f.targetDate || null, notes: f.notes, links })
      }}
      steps={[
        { title: "The goal", description: "What you are saving for, how much, and by when.", content: <>
      <Field label="Goal">{(id) => <Input id={id} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      <div className="full -mt-2 flex flex-wrap gap-1.5">{GOAL_PRESETS.filter((p) => p !== f.name).slice(0, 8).map((p) => <button key={p} type="button" onClick={() => setF({ ...f, name: p })} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{p}</button>)}</div>
      <Field label="Target amount (₹)" hint={/emergency/i.test(f.name) && suggested ? `Suggested: ${formatINR(suggested)} (6 months of spending)` : undefined}>{(id) => <Input id={id} type="number" min="1" step="any" required value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />}</Field>
      <Field label="Target date (optional)">{(id) => <DateInput id={id} value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} />}</Field>
        </> },
        { title: "What backs it", description: "Pick the accounts, funds and assets that count towards it. Nothing is moved.", content: <>
      <Field label="Notes">{(id) => <Input id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />}</Field>
      <LinkPicker sources={sources} links={links} onToggle={toggle} onShare={setPct} />
        </> },
      ]} />
  )
}

