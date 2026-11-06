'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus, Target, Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { emergencyTarget, GOAL_PRESETS, goalProgress, overAllocated } from '@/lib/wealth/goals'
import { buildFacts } from '@/lib/ai/facts'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from './Money'
import { assetValue } from '@/lib/wealth/holdings'
import { Button } from '@/components/ui/button'
import { FieldSet, ScrollList, ScrollListItem } from '@/components/ui/layout'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, Panel, Progress, Select } from './kit'

type GoalLink = { type: 'bank' | 'fund' | 'asset'; id: string; pct: number }

/** Goals: earmark existing accounts, funds and assets. Nothing is moved and net worth is unchanged. */
export function GoalsPanel() {
  const { data, db, netWorth } = useWealth()
  const [dlg, setDlg] = useState<null | { row?: any; del?: boolean }>(null)
  const goals = data.goals
  const progress = useMemo(() => goals.map((g: any) => ({ g, p: goalProgress(g, data) })), [goals, data])
  const over = useMemo(() => overAllocated(goals), [goals])
  const suggested = useMemo(() => emergencyTarget(buildFacts({ ...data, netWorth }, new Date())), [data, netWorth])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span />
        <Button onClick={() => setDlg({})}><Plus className="mr-1.5 h-4 w-4" />Add goal</Button>
      </div>
      {over.length > 0 && <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />Some linked items are earmarked for more than 100% across goals, so they are counted twice. Reduce their shares in the goals that use them.</p>}
      {goals.length === 0 ? <Empty title="No goals yet" description="Create an Emergency fund or a Marriage fund and link the accounts or investments that back it." action={<Button onClick={() => setDlg({})}>Add goal</Button>} /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {progress.map(({ g, p }) => (
            <div key={g.id} className="surface-card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Target className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate font-medium">{g.name}</p><p className="text-xs text-muted-foreground">{g.targetDate ? `By ${formatDate(g.targetDate)}` : 'No target date'}{p.monthsLeft != null ? ` · ${p.monthsLeft} months left` : ''}</p></div></div>
                <div className="flex shrink-0"><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${g.name}`} onClick={() => setDlg({ row: g })}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${g.name}`} onClick={() => setDlg({ row: g, del: true })}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </div>
              <div className="mt-4"><div className="mb-1 flex justify-between text-sm"><span><Money value={p.current} /> <span className="text-muted-foreground">of <Money value={p.target} /></span></span><span className="font-medium">{p.pct}%</span></div><Progress value={p.pct} tone={p.achieved ? 'primary' : p.pct < 40 ? 'warning' : 'primary'} label={`${g.name} progress`} /></div>
              <p className="mt-2 text-xs text-muted-foreground">{p.achieved ? 'Goal reached.' : `${formatINR(p.remaining)} to go${p.monthlyNeeded ? ` · about ${formatINR(p.monthlyNeeded)} a month to reach it by the target date` : ''}${p.onTrackNote ? ` · ${p.onTrackNote}` : ''}`}</p>
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs">{p.links.length === 0 ? <li className="text-muted-foreground">Nothing linked yet. Edit the goal to link accounts or investments.</li> : p.links.map((l: any) => <li key={`${l.type}:${l.id}`} className="flex justify-between gap-2"><span className="truncate">{l.name} <span className="text-muted-foreground">({l.pct}%)</span></span><Money value={l.counted} className="text-muted-foreground" /></li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {dlg && !dlg.del && <GoalForm row={dlg.row} suggested={suggested} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'goals', r); toast.success('Goal saved') }} />}
      <ConfirmDialog open={!!dlg?.del} onOpenChange={(o) => !o && setDlg(null)} title={`Delete “${dlg?.row?.name}”?`} description="Only the goal is removed. The linked accounts and investments are untouched." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'goals', dlg!.row.id); setDlg(null); toast.success('Goal deleted') }} />
    </div>
  )
}

function GoalForm({ row, suggested, onClose, onSave }: { row?: any; suggested: number; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const { data } = useWealth()
  const [f, setF] = useState({ name: row?.name || 'Emergency fund', target: String(row?.target ?? ''), targetDate: row?.targetDate || '', notes: row?.notes || '' })
  const [links, setLinks] = useState<GoalLink[]>(row?.links || [])
  const sources: { type: GoalLink['type']; id: string; label: string; value: number }[] = [
    ...data.bankAccounts.map((a: any) => ({ type: 'bank' as const, id: a.id, label: `${a.type === 'cash' ? 'Cash' : 'Bank'}: ${a.nickname || a.bankName}`, value: a.currentBalance })),
    ...data.funds.map((x: any) => ({ type: 'fund' as const, id: x.id, label: `Fund: ${x.name}`, value: x.currentValue })),
    ...data.assets.map((x: any) => ({ type: 'asset' as const, id: x.id, label: `Asset: ${x.name}`, value: assetValue(x) })),
  ]
  const find = (s: { type: string; id: string }) => links.find((l) => l.type === s.type && l.id === s.id)
  const toggle = (s: { type: GoalLink['type']; id: string }) => setLinks((ls) => (find(s) ? ls.filter((l) => !(l.type === s.type && l.id === s.id)) : [...ls, { type: s.type, id: s.id, pct: 100 }]))
  const setPct = (s: { type: string; id: string }, pct: number) => setLinks((ls) => ls.map((l) => (l.type === s.type && l.id === s.id ? { ...l, pct } : l)))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={row ? 'Edit goal' : 'Add goal'} wide
      onSubmit={async () => {
        const target = Number(f.target)
        if (!(target > 0)) throw new Error('Target amount must be positive')
        if (f.targetDate && f.targetDate < new Date().toISOString().slice(0, 10)) throw new Error('Target date must be in the future')
        await onSave({ ...row, id: row?.id, name: f.name.trim(), target, targetDate: f.targetDate || null, notes: f.notes, links })
      }}>
      <Field label="Goal">{(id) => <Input id={id} required list="goal-presets" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      <datalist id="goal-presets">{GOAL_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
      <Field label="Target amount (₹)" hint={/emergency/i.test(f.name) && suggested ? `Suggested: ${formatINR(suggested)} (6 months of spending)` : undefined}>{(id) => <Input id={id} type="number" min="1" step="any" required value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />}</Field>
      <Field label="Target date (optional)">{(id) => <Input id={id} type="date" value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} />}</Field>
      <Field label="Notes">{(id) => <Input id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />}</Field>
      <FieldSet legend="Linked to" className="full">
        {sources.length === 0 ? <p className="text-xs text-muted-foreground">Add bank accounts, funds or assets first.</p> : (
          <ScrollList>{sources.map((s) => { const l = find(s); return (
            <ScrollListItem key={`${s.type}:${s.id}`}>
              <label className="flex min-w-0 flex-1 items-center gap-2"><input type="checkbox" className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" checked={!!l} onChange={() => toggle(s)} /><span className="min-w-0"><span className="block truncate">{s.label}</span><span className="text-xs text-muted-foreground">{formatINR(s.value)}</span></span></label>
              {l && <Select aria-label={`Share of ${s.label}`} className="h-8 w-24 text-xs" value={l.pct} onChange={(e) => setPct(s, Number(e.target.value))}>{[100, 75, 50, 25].map((p) => <option key={p} value={p}>{p}%</option>)}</Select>}
            </ScrollListItem>) })}</ScrollList>
        )}
      </FieldSet>
    </FormDialog>
  )
}

