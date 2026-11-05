'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deleteCategory, renameCategory, saveCategories } from '@/lib/wealth/actions'
import { categoryBreakdown, dailyTotals, groupByDay, monthSummary } from '@/lib/wealth/transactions'
import { useCategories } from '@/lib/wealth/useCategories'
import { formatCompactINR, formatDate, formatINR, modeLabel } from '@/lib/wealth/format'
import { daysInMonth } from '@/lib/wealth/calc'
import { Money } from '../Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CHART_PALETTE, Empty, Panel, Select, chartTooltipStyle } from '../kit'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { cn } from '@/lib/utils'

export interface Tx { key: string; kind: 'expense' | 'income' | 'transfer'; id: string; date: string; amount: number; category: string; title: string; sub: string; legacy?: boolean; raw: any }

const KIND_STYLE = { expense: 'text-destructive', income: 'text-success', transfer: 'text-muted-foreground' } as const
const sign = { expense: '-', income: '+', transfer: '' } as const

export function SummaryStrip({ list }: { list: Tx[] }) {
  const s = monthSummary(list as any)
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="surface-card px-4 py-3"><p className="text-xs text-muted-foreground">Income</p><p className="text-lg font-semibold text-success"><Money value={s.income} /></p></div>
      <div className="surface-card px-4 py-3"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-semibold text-destructive"><Money value={s.expense} /></p></div>
      <div className="surface-card px-4 py-3"><p className="text-xs text-muted-foreground">Net</p><p className="text-lg font-semibold"><Money value={s.net} signed /></p></div>
    </div>
  )
}

function Row({ t, onEdit, onDelete }: { t: Tx; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="min-w-0"><span className="block truncate font-medium">{t.title}</span><span className="block truncate text-xs text-muted-foreground">{t.kind === 'expense' ? `${t.sub} · ${modeLabel(t.raw.mode)}` : t.sub}</span></span>
      <span className="flex shrink-0 items-center gap-0.5">
        <span className={cn('mr-1 font-medium tabular-nums', KIND_STYLE[t.kind])}>{sign[t.kind]}<Money value={t.amount} /></span>
        {t.kind === 'expense' && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit expense" onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>}
        {!t.legacy && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete ${t.kind}`} onClick={() => onDelete(t)}><Trash2 className="h-3.5 w-3.5" /></Button>}
      </span>
    </li>
  )
}

/** Daily view: transactions grouped by date with day totals, plus search and filters. */
export function TransactionsView({ list, ym, onEdit, onDelete, onAdd }: { list: Tx[]; ym: string; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void; onAdd: () => void }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | Tx['kind']>('all')
  const [cat, setCat] = useState('')
  const cats = useCategories()
  const allCats = useMemo(() => [...new Set([...cats.expense, ...cats.income])], [cats])

  const shown = useMemo(() => list.filter((t) => (kind === 'all' || t.kind === kind) && (!cat || t.category === cat) && (!q || `${t.title} ${t.sub} ${t.category}`.toLowerCase().includes(q.toLowerCase()))), [list, kind, cat, q])
  const groups = useMemo(() => groupByDay(shown as any) as unknown as { date: string; items: Tx[]; income: number; expense: number }[], [shown])

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = ['Date,Type,Category,Description,Detail,Amount', ...shown.map((t) => [t.date, t.kind, t.category, t.title, t.sub, t.amount].map(esc).join(','))]
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `transactions-${ym}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <SummaryStrip list={list} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search transactions" className="pl-9" placeholder="Search description, category" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div role="group" aria-label="Type" className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(['all', 'expense', 'income', 'transfer'] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring', kind === k ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>{k}</button>)}
        </div>
        <Select aria-label="Category" className="w-auto" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{allCats.map((c) => <option key={c}>{c}</option>)}</Select>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!shown.length}><Download className="mr-1.5 h-4 w-4" />CSV</Button>
      </div>
      {groups.length === 0 ? <Empty title={list.length ? 'No matches' : 'No transactions this month'} action={!list.length ? <Button onClick={onAdd}><Plus className="mr-1.5 h-4 w-4" />Add transaction</Button> : undefined} /> : (
        <div className="space-y-3">
          {groups.map((g) => (
            <section key={g.date} className="surface-card">
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-xs">
                <span className="font-semibold">{new Date(g.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                <span className="flex gap-3 text-muted-foreground">{g.income > 0 && <span className="text-success">+{formatINR(g.income)}</span>}{g.expense > 0 && <span className="text-destructive">-{formatINR(g.expense)}</span>}</span>
              </header>
              <ul className="divide-y divide-border px-4">{g.items.map((t) => <Row key={t.key} t={t} onEdit={onEdit} onDelete={onDelete} />)}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/** Calendar view: each day shows what came in and went out; select a day to see its transactions. */
export function CalendarView({ list, ym, onEdit, onDelete }: { list: Tx[]; ym: string; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void }) {
  const [sel, setSel] = useState<string>('')
  const [y, m] = ym.split('-').map(Number)
  const totals = useMemo(() => dailyTotals(list as any), [list])
  const first = new Date(y, m - 1, 1).getDay() // Sunday-first like Money Manager
  const days = daysInMonth(y, m)
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const iso = (d: number) => `${ym}-${String(d).padStart(2, '0')}`
  const todayIso = new Date().toISOString().slice(0, 10)
  const dayItems = sel ? list.filter((t) => t.date === sel) : []

  return (
    <div className="space-y-4">
      <SummaryStrip list={list} />
      <Panel bodyClassName="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />
            const t = totals[iso(d)]
            const on = sel === iso(d)
            return (
              <button key={d} type="button" aria-pressed={on} aria-label={`${d} ${t ? `income ${t.income}, expense ${t.expense}` : 'no transactions'}`} onClick={() => setSel(on ? '' : iso(d))}
                className={cn('flex min-h-14 flex-col items-center rounded-md border px-0.5 py-1 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:min-h-20 sm:items-start sm:px-1.5', on ? 'border-primary bg-accent' : 'border-border hover:bg-muted', iso(d) === todayIso && !on && 'border-primary/50')}>
                <span className={cn('text-xs font-medium', iso(d) === todayIso && 'text-primary')}>{d}</span>
                {t?.income ? <span className="max-w-full truncate text-success">{formatCompactINR(t.income).replace('₹', '')}</span> : null}
                {t?.expense ? <span className="max-w-full truncate text-destructive">{formatCompactINR(t.expense).replace('₹', '')}</span> : null}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground"><span className="text-success">Green</span> = money in, <span className="text-destructive">red</span> = money out (₹, compact). Transfers are not shown.</p>
      </Panel>
      {sel && (
        <Panel title={formatDate(sel)} description={dayItems.length ? undefined : 'No transactions on this day'}>
          {dayItems.length > 0 && <ul className="divide-y divide-border">{dayItems.map((t) => <Row key={t.key} t={t} onEdit={onEdit} onDelete={onDelete} />)}</ul>}
        </Panel>
      )}
    </div>
  )
}

/** Stats view: where the money went / came from, by category. */
export function StatsView({ list }: { list: Tx[] }) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const { privacyMode } = usePrivacyMode()
  const rows = useMemo(() => categoryBreakdown(list as any, kind), [list, kind])
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <div className="space-y-4">
      <SummaryStrip list={list} />
      <Panel title="By category" action={
        <div role="group" aria-label="Stats type" className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(['expense', 'income'] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring', kind === k ? 'bg-card shadow-card' : 'text-muted-foreground')}>{k === 'expense' ? 'Expenses' : 'Income'}</button>)}
        </div>}>
        {rows.length === 0 ? <Empty title={`No ${kind === 'expense' ? 'expenses' : 'income'} this month`} /> : (
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="relative h-52 w-52 shrink-0" role="img" aria-label={`${kind} by category donut chart`}>
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rows} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2}>{rows.map((r, i) => <Cell key={r.name} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}</Pie><Tooltip {...chartTooltipStyle} formatter={(v: number) => (privacyMode ? '••••' : formatINR(v))} /></PieChart></ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center"><span className="text-xs text-muted-foreground">Total</span><span className="text-sm font-semibold"><Money value={total} compact /></span></div>
            </div>
            <ul className="w-full min-w-0 flex-1 divide-y divide-border">{rows.map((r, i) => (
              <li key={r.name} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} /><span className="truncate">{r.name}</span><span className="text-xs text-muted-foreground">{r.pct}%</span></span><Money value={r.value} className="font-medium" /></li>
            ))}</ul>
          </div>
        )}
      </Panel>
    </div>
  )
}

/** Add, rename and delete expense / income categories. Renames update past entries; deletes move entries to "Other". */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const { db, data } = useWealth()
  const cats = useCategories()
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null)
  const [del, setDel] = useState<string | null>(null)
  const list = cats[kind]
  const stored = !!data.meta.find((m: any) => m.key === 'categories')
  const used = (c: string) => (kind === 'expense' ? data.expenses.filter((e: any) => e.category === c).length : data.bankTxns.filter((t: any) => t.type === 'income' && t.category === c).length)
  const init = async () => { if (!stored) await saveCategories(db, { expense: cats.expense, income: cats.income }) }
  const run = async (fn: () => Promise<void>) => { try { await init(); await fn() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') } }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Categories</DialogTitle><DialogDescription>Renaming updates past entries. Deleting moves its entries to “Other”.</DialogDescription></DialogHeader>
        <div role="tablist" aria-label="Category type" className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
          {(['expense', 'income'] as const).map((k) => <button key={k} role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setEditing(null) }} className={cn('rounded-md py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring', kind === k ? 'bg-card shadow-card' : 'text-muted-foreground')}>{k === 'expense' ? 'Expense' : 'Income'}</button>)}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n) return; if (list.some((c) => c.toLowerCase() === n.toLowerCase())) return void toast.error('That category already exists'); run(async () => { await saveCategories(db, { expense: kind === 'expense' ? [...cats.expense, n] : cats.expense, income: kind === 'income' ? [...cats.income, n] : cats.income }); setName('') }) }}>
          <Input aria-label="New category" placeholder={`New ${kind} category`} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} /><Button type="submit" disabled={!name.trim()}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </form>
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {list.map((c) => (
            <li key={c} className="flex items-center justify-between gap-2 py-2 text-sm">
              {editing?.from === c ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); const to = editing.to.trim(); if (!to) return; run(async () => { await renameCategory(db, kind, c, to); setEditing(null); toast.success('Renamed') }) }}>
                  <Input aria-label={`Rename ${c}`} autoFocus value={editing.to} maxLength={30} onChange={(e) => setEditing({ from: c, to: e.target.value })} /><Button type="submit" size="sm">Save</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 truncate">{c}<span className="ml-2 text-xs text-muted-foreground">{used(c)} entr{used(c) === 1 ? 'y' : 'ies'}</span></span>
                  <span className="flex shrink-0"><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Rename ${c}`} onClick={() => setEditing({ from: c, to: c })}><Pencil className="h-3.5 w-3.5" /></Button>
                    {c !== 'Other' && <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${c}`} onClick={() => setDel(c)}><Trash2 className="h-3.5 w-3.5" /></Button>}</span>
                </>
              )}
            </li>
          ))}
        </ul>
        <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete “${del}”?`} description={`${del ? used(del) : 0} entries will move to “Other”.`} confirmLabel="Delete" variant="destructive" onConfirm={() => run(async () => { await deleteCategory(db, kind, del!); setDel(null); toast.success('Deleted') })} />
      </DialogContent>
    </Dialog>
  )
}
