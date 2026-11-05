'use client'

import { useMemo, useState } from 'react'
import { History, Pause, Pencil, Play, Plus, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { remove, save } from '@/lib/wealth/actions'
import { CHANNELS, FREQUENCIES, TEMPLATES, newRule, runDueRules } from '@/lib/ai/automation'
import { cap, formatDate, humanize } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, Panel, Select } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { useAi } from './useAi'

const GROUPS = ['Budget', 'Cards', 'Insurance', 'Mutual Funds', 'Bank Accounts', 'Family']

/** Simple automation: pick a template, set a few options. Rules only notify; they never move money or edit records. */
export function AutomationManager() {
  const { db, isDemo } = useWealth()
  const { facts, data } = useAi()
  const [dlg, setDlg] = useState<null | { rule: any; isNew: boolean }>(null)
  const [del, setDel] = useState<any>(null)
  const [picker, setPicker] = useState(false)
  const rules: any[] = data.automations
  const runs: any[] = useMemo(() => [...data.automationRuns].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30), [data.automationRuns])

  const runNow = async () => {
    if (!facts) return
    const forced = rules.map((r) => ({ ...r, nextRunAt: '0000-00-00' }))
    const { runs: made, rules: next } = runDueRules(forced, facts, data, new Date())
    for (const r of next) await save(db, 'automations', r)
    for (const r of made) await db.automationRuns.put(r)
    toast.success(`Ran ${made.length} automation${made.length === 1 ? '' : 's'}: ${made.filter((m: any) => m.fired).length} triggered`)
  }

  return (
    <div className="space-y-4">
      <div role="note" className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">Automations only <strong className="text-foreground">notify</strong> you. They never move money, place investment orders or change your records. They are checked while the app is open{isDemo ? ' (demo: sample rules and history)' : ''}; email and SMS copies are sent at that time.</div>
      <Panel title="Your automations" action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={runNow} disabled={!rules.length}><Play className="mr-1 h-4 w-4" />Run now</Button><Button size="sm" onClick={() => setPicker(true)}><Plus className="mr-1 h-4 w-4" />Add</Button></div>}>
        {rules.length === 0 ? <Empty title="No automations" description="Start from a template, e.g. “Card payment due reminder”." /> : (
          <ul className="divide-y divide-border">{rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-medium"><Zap className={cn('h-3.5 w-3.5', r.enabled ? 'text-primary' : 'text-muted-foreground')} />{r.name}{!r.enabled && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">Paused</span>}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{TEMPLATES[r.templateId]?.group} · {cap(r.frequency)} · {Object.keys(r.channels).filter((c) => r.channels[c]).map(humanize).join(', ') || 'No channel'} · Last run {r.lastRunAt ? formatDate(r.lastRunAt.slice(0, 10)) : 'never'} · Next {r.enabled ? formatDate(r.nextRunAt) : '—'}</p></div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={r.enabled ? `Pause ${r.name}` : `Resume ${r.name}`} title={r.enabled ? 'Pause' : 'Resume'} onClick={() => save(db, 'automations', { ...r, enabled: !r.enabled })}>{r.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${r.name}`} onClick={() => setDlg({ rule: r, isNew: false })}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${r.name}`} onClick={() => setDel(r)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
            </li>))}</ul>
        )}
      </Panel>
      <Panel title="History" action={<History className="h-4 w-4 text-muted-foreground" />}>
        {runs.length === 0 ? <Empty title="Nothing has run yet" /> : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">{runs.map((r) => (
            <li key={r.id} className="py-2.5 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{r.ruleName}</span><span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', r.status === 'failed' ? 'bg-destructive/15 text-destructive' : r.fired ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>{r.status === 'failed' ? 'Failed' : r.fired ? 'Triggered' : 'No action'}</span></div>
              <p className="text-xs text-muted-foreground">{formatDate(r.at.slice(0, 10))} · {r.body}</p>
              {r.deliveries && <p className="text-[11px] text-muted-foreground">Delivery: {Object.entries(r.deliveries).map(([k, v]) => `${humanize(k)} ${String(v).replace(/_/g, ' ')}`).join(', ')}</p>}</li>))}</ul>
        )}
      </Panel>

      {picker && (
        <FormDialog open onOpenChange={(o) => !o && setPicker(false)} title="Choose a template" submitLabel="Continue" onSubmit={async () => {}} wide>
          <div className="full space-y-4">{GROUPS.map((g) => (
            <div key={g}><p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
              <div className="grid gap-1.5 sm:grid-cols-2">{Object.entries(TEMPLATES).filter(([, t]) => t.group === g).map(([id, t]) => (
                <button key={id} type="button" className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted" onClick={() => { setPicker(false); setDlg({ rule: newRule(id), isNew: true }) }}>{t.label}</button>))}</div></div>))}
            <p className="text-xs text-muted-foreground">Digital Legacy reminders and contact notifications are managed on the Digital Legacy page.</p></div>
        </FormDialog>
      )}
      {dlg && <RuleForm rule={dlg.rule} isNew={dlg.isNew} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'automations', r); toast.success('Automation saved') }} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete “${del?.name}”?`} description="Its history is kept." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await remove(db, 'automations', del.id); setDel(null); toast.success('Deleted') }} />
    </div>
  )
}

function RuleForm({ rule, isNew, onClose, onSave }: { rule: any; isNew: boolean; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const tpl = TEMPLATES[rule.templateId]
  const { isDemo } = useWealth()
  const [f, setF] = useState({ name: rule.name, frequency: rule.frequency, startDate: rule.startDate || '', endDate: rule.endDate || '', enabled: rule.enabled })
  const [params, setParams] = useState<Record<string, number>>(rule.params)
  const [channels, setChannels] = useState<Record<string, boolean>>(rule.channels)
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`${isNew ? 'New' : 'Edit'} automation`} description={tpl.label} wide
      onSubmit={async () => {
        if (!f.name.trim()) throw new Error('Give it a name')
        if (f.endDate && f.startDate && f.endDate < f.startDate) throw new Error('End date is before start date')
        if (!Object.values(channels).some(Boolean)) throw new Error('Choose at least one channel')
        await onSave({ ...rule, name: f.name.trim(), frequency: f.frequency, startDate: f.startDate, endDate: f.endDate, enabled: f.enabled, params, channels })
      }}>
      <Field label="Name" className="full">{(id) => <Input id={id} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      {Object.entries(tpl.params).map(([k, p]: [string, any]) => <Field key={k} label={`${p.label} (${p.unit})`}>{(id) => <Input id={id} type="number" min="1" step="any" value={params[k] ?? p.default} onChange={(e) => setParams({ ...params, [k]: Number(e.target.value) })} />}</Field>)}
      <Field label="How often">{(id) => <Select id={id} value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>{FREQUENCIES.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</Select>}</Field>
      <Field label="Start date">{(id) => <Input id={id} type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />}</Field>
      <Field label="End date (optional)">{(id) => <Input id={id} type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />}</Field>
      <fieldset className="full"><legend className="mb-1.5 text-sm font-medium">Notify me by</legend>
        <div className="flex flex-wrap gap-4">{CHANNELS.map((c) => {
          const unavailable = c.v === 'push' || (isDemo && (c.v === 'email' || c.v === 'sms'))
          return <label key={c.v} className={cn('flex items-center gap-2 text-sm', unavailable && 'opacity-50')}><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" disabled={unavailable} checked={!!channels[c.v] && !unavailable} onChange={(e) => setChannels({ ...channels, [c.v]: e.target.checked })} />{c.l}{c.v === 'push' ? ' (not set up)' : isDemo && c.v !== 'inApp' ? ' (not in demo)' : ''}</label>
        })}</div></fieldset>
      <label className="full flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />Enabled</label>
    </FormDialog>
  )
}
