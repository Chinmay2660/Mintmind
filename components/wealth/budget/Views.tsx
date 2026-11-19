'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, CheckSquare, ChevronLeft, ChevronRight, Copy, Download, Pencil, Plus, Scale, Search, Star, Trash2, X } from 'lucide-react'
import { SnapCarousel } from '@/components/ui/snap-carousel'
import { TxnRow } from './TxnRow'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deleteCategory, renameCategory, saveCategories } from '@/lib/wealth/actions'
import { categoryBreakdown, dailyTotals, groupByDay, inMonth, monthSummary } from '@/lib/wealth/transactions'
import { useCategories } from '@/lib/wealth/useCategories'
import { formatCompactINR, formatDate, formatINR, modeLabel } from '@/lib/wealth/format'
import { daysInMonth } from '@/lib/wealth/calc'
import { Money } from '../Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
  const count = (k: Tx['kind']) => list.filter((t) => t.kind === k).length
  const saved = s.income > 0 ? Math.round((s.net / s.income) * 100) : null
  const cards = [
    { key: 'income', label: 'Income', icon: ArrowDownLeft, value: <Money value={s.income} />, hint: `${count('income')} ${count('income') === 1 ? 'entry' : 'entries'} this month`, tone: 'from-primary to-[hsl(282_100%_68%)] text-primary-foreground' },
    { key: 'expense', label: 'Expenses', icon: ArrowUpRight, value: <Money value={s.expense} />, hint: `${count('expense')} ${count('expense') === 1 ? 'expense' : 'expenses'} this month`, tone: 'from-[hsl(217_82%_52%)] to-[hsl(200_90%_62%)] text-white' },
    { key: 'net', label: s.net < 0 ? 'Overspent' : 'Saved', icon: Scale, value: <Money value={s.net} signed />, hint: saved === null ? 'No income recorded yet' : `${saved}% of income`, tone: 'from-foreground to-[hsl(var(--foreground)/0.82)] text-background' },
  ]
  // Swipeable on phones, three across from tablet up. Every figure is the month's real total.
  return (
    <SnapCarousel label="Month summary" cols={3} itemWidth="w-[72%]">
      {cards.map((c) => (
        <div key={c.key} className={cn('relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 shadow-card', c.tone)}>
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20"><c.icon className="h-4 w-4" aria-hidden /></span>
            <p className="text-sm font-medium opacity-90">{c.label}</p>
          </div>
          <p className="relative mt-4 text-2xl font-semibold tracking-tight tabular-nums">{c.value}</p>
          <p className="relative mt-1 text-xs opacity-80">{c.hint}</p>
        </div>
      ))}
    </SnapCarousel>
  )
}

function Row({ t, onEdit, onDelete, onDuplicate, onBookmark, selecting, selected, onToggle, onLongPress }: {
  t: Tx; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void; onDuplicate?: (t: Tx) => void
  onBookmark?: (t: Tx, on: boolean) => void; selecting?: boolean; selected?: boolean; onToggle?: (t: Tx) => void; onLongPress?: (t: Tx) => void
}) {
  const starred = !!t.raw?.bookmarked
  return (
    <TxnRow kind={t.kind} title={t.title} category={t.category} amount={t.amount} selected={selected}
      meta={t.kind === 'expense' ? `${t.sub} · ${modeLabel(t.raw.mode)}` : t.sub}
      onLongPress={onLongPress && !selecting ? () => onLongPress(t) : undefined}
      leading={selecting ? <Checkbox checked={!!selected} onChange={() => onToggle?.(t)} aria-label={`Select ${t.title}`} /> : undefined}
      actions={selecting ? undefined : <>
        {onBookmark && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={starred ? 'Remove bookmark' : 'Bookmark'} aria-pressed={starred} onClick={() => onBookmark(t, !starred)}><Star className={cn('h-4 w-4', starred && 'fill-[hsl(var(--highlight))] text-[hsl(85_60%_30%)] dark:text-highlight')} /></Button>}
        {t.kind === 'expense' && onDuplicate && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Duplicate expense" title="Duplicate" onClick={() => onDuplicate(t)}><Copy className="h-4 w-4" /></Button>}
        {t.kind === 'expense' && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Edit expense" onClick={() => onEdit(t)}><Pencil className="h-4 w-4" /></Button>}
        {!t.legacy && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Delete ${t.kind}`} onClick={() => onDelete(t)}><Trash2 className="h-4 w-4" /></Button>}
      </>} />
  )
}

function exportTxCsv(rows: Tx[], ym: string) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = ['Date,Type,Category,Description,Detail,Amount', ...rows.map((t) => [t.date, t.kind, t.category, t.title, t.sub, t.amount].map(esc).join(','))]
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
  const a = document.createElement('a'); a.href = url; a.download = `transactions-${ym}.csv`; a.click(); URL.revokeObjectURL(url)
}

/** Daily view: transactions grouped by date with day totals, search, filters, bookmarks and multi-select. */
export function TransactionsView({ list, ym, onEdit, onDelete, onAdd, onDuplicate, onBookmark, onBulkDelete }: {
  list: Tx[]; ym: string; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void; onAdd: () => void; onDuplicate?: (t: Tx) => void
  onBookmark?: (items: Tx[], on: boolean) => void; onBulkDelete?: (items: Tx[]) => void
}) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | Tx['kind']>('all')
  const [cat, setCat] = useState('')
  const [onlyStar, setOnlyStar] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const cats = useCategories()
  const allCats = useMemo(() => [...new Set([...cats.expense, ...cats.income])], [cats])

  const shown = useMemo(() => list.filter((t) => (kind === 'all' || t.kind === kind) && (!cat || t.category === cat) && (!onlyStar || t.raw?.bookmarked) && (!q || `${t.title} ${t.sub} ${t.category}`.toLowerCase().includes(q.toLowerCase()))), [list, kind, cat, q, onlyStar])
  const groups = useMemo(() => groupByDay(shown as any) as unknown as { date: string; items: Tx[]; income: number; expense: number }[], [shown])
  const starCount = useMemo(() => list.filter((t) => t.raw?.bookmarked).length, [list])

  const chosen = shown.filter((t) => picked.has(t.key))
  const toggle = (t: Tx) => setPicked((p) => { const n = new Set(p); n.has(t.key) ? n.delete(t.key) : n.add(t.key); return n })
  const begin = (t?: Tx) => { setSelecting(true); setPicked(t ? new Set([t.key]) : new Set()) }
  const stop = () => { setSelecting(false); setPicked(new Set()) }
  const allOn = shown.length > 0 && chosen.length === shown.length
  const everyStarred = chosen.length > 0 && chosen.every((t) => t.raw?.bookmarked)

  return (
    <div className="space-y-4">
      <SummaryStrip list={list} />
      <div className="space-y-2.5 md:flex md:flex-wrap md:items-center md:gap-2 md:space-y-0">
        <div className="relative md:min-w-56 md:flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search transactions" className="h-11 pl-9 md:h-10" placeholder="Search description, category" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div role="group" aria-label="Type" className="grid grid-cols-4 rounded-xl border border-border bg-muted p-1 md:inline-grid md:w-auto">
          {(['all', 'expense', 'income', 'transfer'] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn('min-h-9 rounded-lg px-3 text-xs font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring', kind === k ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>{k}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 md:w-52 md:flex-none"><Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{allCats.map((c) => <option key={c}>{c}</option>)}</Select></div>
          <Button variant={onlyStar ? 'default' : 'outline'} onClick={() => setOnlyStar((v) => !v)} aria-pressed={onlyStar} aria-label={`Bookmarked only (${starCount})`} className="h-10 shrink-0"><Star className={cn('h-4 w-4', onlyStar && 'fill-current')} /><span className="ml-1.5 tabular-nums">{starCount}</span></Button>
          <Button variant="outline" onClick={() => (selecting ? stop() : begin())} aria-pressed={selecting} disabled={!shown.length && !selecting} className="h-10 shrink-0"><CheckSquare className="h-4 w-4 md:mr-1.5" /><span className="max-md:sr-only">{selecting ? 'Done' : 'Select'}</span></Button>
          <Button variant="outline" onClick={() => exportTxCsv(shown, ym)} disabled={!shown.length} aria-label="Download CSV" className="h-10 shrink-0"><Download className="h-4 w-4 md:mr-1.5" /><span className="max-md:sr-only">CSV</span></Button>
        </div>
      </div>
      {groups.length === 0 ? <Empty title={onlyStar ? 'No bookmarked transactions this month' : list.length ? 'No matches' : 'No transactions this month'} description={onlyStar ? 'Tap the star on a transaction to keep it handy.' : undefined} action={!list.length ? <Button onClick={onAdd}><Plus className="mr-1.5 h-4 w-4" />Add transaction</Button> : undefined} /> : (
        <div className={cn('space-y-3', selecting && 'pb-24')}>
          {groups.map((g) => (
            <section key={g.date} className="surface-card">
              <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl font-semibold tabular-nums leading-none">{g.date.slice(8, 10)}</span>
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">{new Date(g.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{g.date.slice(5, 7)}.{g.date.slice(0, 4)}</span>
                </span>
                <span className="flex gap-3 text-xs font-medium tabular-nums">{g.income > 0 && <span>+{formatINR(g.income)}</span>}{g.expense > 0 && <span className="text-muted-foreground">-{formatINR(g.expense)}</span>}</span>
              </header>
              <ul className="divide-y divide-border px-4">{g.items.map((t) => <Row key={t.key} t={t} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onBookmark={onBookmark ? (x, on) => onBookmark([x], on) : undefined} selecting={selecting} selected={picked.has(t.key)} onToggle={toggle} onLongPress={begin} />)}</ul>
            </section>
          ))}
        </div>
      )}

      {selecting && (
        <div role="toolbar" aria-label="Selected transactions" className="fixed inset-x-3 z-40 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-elevated md:left-1/2 md:right-auto md:w-[28rem] md:-translate-x-1/2" style={{ bottom: 'calc(var(--mobile-tab-bar-height) + var(--mobile-safe-bottom) + 0.5rem)' }}>
          <label className="flex min-h-10 items-center gap-2 px-2 text-sm"><Checkbox checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(shown.map((t) => t.key)))} aria-label="Select all shown" /><span className="tabular-nums">{chosen.length} selected</span></label>
          <span className="flex-1" />
          {onBookmark && <Button variant="outline" size="icon" className="h-10 w-10" disabled={!chosen.length} aria-label={everyStarred ? 'Remove bookmarks' : 'Bookmark selected'} onClick={() => { onBookmark(chosen, !everyStarred); stop() }}><Star className="h-4 w-4" /></Button>}
          {onBulkDelete && <Button variant="destructive" className="h-10" disabled={!chosen.filter((t) => !t.legacy).length} onClick={() => { onBulkDelete(chosen.filter((t) => !t.legacy)); stop() }}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>}
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Cancel selection" onClick={stop}><X className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  )
}

/** Calendar view: each day shows what came in and went out; select a day to see its transactions. */
export function CalendarView({ list, ym, onEdit, onDelete, onDuplicate, onBookmark }: { list: Tx[]; ym: string; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void; onDuplicate?: (t: Tx) => void; onBookmark?: (items: Tx[], on: boolean) => void }) {
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
          {dayItems.length > 0 && <ul className="divide-y divide-border">{dayItems.map((t) => <Row key={t.key} t={t} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onBookmark={onBookmark ? (x, on) => onBookmark([x], on) : undefined} />)}</ul>}
        </Panel>
      )}
    </div>
  )
}

/** Stats view: where the money went / came from, by category. */
export function StatsView({ list }: { list: Tx[] }) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [picked, setPicked] = useState<string | null>(null)
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
              <li key={r.name}><button type="button" aria-expanded={picked === r.name} onClick={() => setPicked(picked === r.name ? null : r.name)} className={cn('flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left text-sm outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring', picked === r.name && 'bg-primary/10')}><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} /><span className="truncate">{r.name}</span><span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground tabular-nums">{r.pct}%</span></span><Money value={r.value} className="font-medium tabular-nums" /></button></li>
            ))}</ul>
          </div>
        )}
      </Panel>
      {picked && (
        <Panel title={picked} description={`${list.filter((t) => t.kind === kind && t.category === picked).length} this month`} action={<button type="button" onClick={() => setPicked(null)} className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">Close</button>}>
          <ul className="divide-y divide-border">{list.filter((t) => t.kind === kind && t.category === picked).map((t) => <TxnRow key={t.key} kind={t.kind} title={t.title} category={t.category} meta={`${t.sub} · ${formatDate(t.date)}`} amount={t.amount} />)}</ul>
        </Panel>
      )}
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

/** Monthly view: the 12 months of a year with money in, money out and the difference. Tap a month to open it. */
export function MonthlyView({ all, ym, curYm, onPick }: { all: Tx[]; ym: string; curYm: string; onPick: (ym: string) => void }) {
  const [year, setYear] = useState(Number(ym.slice(0, 4)))
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`
    return { key, label: new Date(year, i, 1).toLocaleString('en-IN', { month: 'long' }), s: monthSummary(inMonth(all as any, key) as any) }
  }), [all, year])
  const totals = months.reduce((a, m) => ({ income: a.income + m.s.income, expense: a.expense + m.s.expense }), { income: 0, expense: 0 })
  const maxYear = Number(curYm.slice(0, 4))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Previous year" className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-center"><p className="text-lg font-semibold tabular-nums">{year}</p><p className="text-xs text-muted-foreground">Income <Money value={totals.income} compact /> · Expenses <Money value={totals.expense} compact /></p></div>
        <button type="button" onClick={() => setYear((y) => y + 1)} disabled={year >= maxYear} aria-label="Next year" className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <ul className="surface-card divide-y divide-border">
        {months.map((m) => {
          const empty = m.s.income === 0 && m.s.expense === 0
          const future = m.key > curYm
          return (
            <li key={m.key}>
              <button type="button" disabled={future} onClick={() => onPick(m.key)} aria-current={m.key === ym ? 'date' : undefined} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted disabled:opacity-40', m.key === ym && 'bg-primary/10')}>
                <span className="w-24 shrink-0 text-sm font-medium">{m.label}</span>
                {empty ? <span className="flex-1 text-xs text-muted-foreground">{future ? 'Upcoming' : 'No transactions'}</span> : (
                  <span className="grid flex-1 grid-cols-3 gap-2 text-right text-xs tabular-nums">
                    <span><span className="block text-[10px] uppercase text-muted-foreground">In</span><Money value={m.s.income} compact /></span>
                    <span><span className="block text-[10px] uppercase text-muted-foreground">Out</span><Money value={m.s.expense} compact /></span>
                    <span><span className="block text-[10px] uppercase text-muted-foreground">Total</span><span className="font-semibold"><Money value={m.s.net} compact signed /></span></span>
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Bars({ rows, total }: { rows: { name: string; value: number }[]; total: number }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nothing recorded this month.</p>
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => {
        const pct = total > 0 ? Math.round((r.value / total) * 100) : 0
        return (
          <li key={r.name}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate">{r.name}</span><span className="shrink-0 tabular-nums"><Money value={r.value} /> <span className="text-xs text-muted-foreground">{pct}%</span></span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${r.name}: ${pct} percent`}><div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: CHART_PALETTE[i % CHART_PALETTE.length] }} /></div>
          </li>
        )
      })}
    </ul>
  )
}

/** Summary view: the month in a few numbers, where the money went, how it was paid and from which account. */
export function SummaryView({ list, ym }: { list: Tx[]; ym: string }) {
  const { data } = useWealth()
  const s = monthSummary(list as any)
  const spend = list.filter((t) => t.kind === 'expense')
  const cats = categoryBreakdown(list as any, 'expense').slice(0, 5)
  const [y, m] = ym.split('-').map(Number)
  const now = new Date()
  const elapsed = y === now.getFullYear() && m === now.getMonth() + 1 ? now.getDate() : daysInMonth(y, m)
  const avg = elapsed > 0 ? s.expense / elapsed : 0
  const biggest = [...spend].sort((a, b) => b.amount - a.amount)[0]
  const rate = s.income > 0 ? Math.round((s.net / s.income) * 100) : null

  const group = (key: (t: Tx) => string) => {
    const map = new Map<string, number>()
    for (const t of spend) map.set(key(t), (map.get(key(t)) || 0) + t.amount)
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)
  }
  const accountName = (t: Tx) => {
    const r = t.raw || {}
    if (r.cardId) { const c = data.cards.find((x: any) => x.id === r.cardId); return c ? `${c.bank} ${c.cardName}` : 'Credit card' }
    const a = data.bankAccounts.find((x: any) => x.id === r.accountId)
    return a ? a.nickname || a.bankName : 'Not linked'
  }
  const byMode = group((t) => modeLabel(t.raw?.mode))
  const byAccount = group(accountName)
  const stat = (label: string, value: React.ReactNode, hint?: string) => <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>{hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}</div>

  return (
    <div className="space-y-4">
      <SummaryStrip list={list} />
      <Panel title="This month in numbers">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stat('Average a day', <Money value={Math.round(avg)} />, `over ${elapsed} day${elapsed === 1 ? '' : 's'}`)}
          {stat('Savings rate', rate === null ? 'No income' : `${rate}%`, rate === null ? 'record income to see it' : rate < 0 ? 'spent more than earned' : 'of income kept')}
          {stat('Transactions', list.length, `${spend.length} expense${spend.length === 1 ? '' : 's'}`)}
          {stat('Biggest expense', biggest ? <Money value={biggest.amount} /> : '-', biggest ? biggest.title : undefined)}
        </dl>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top categories" description="Share of this month's spending"><Bars rows={cats} total={s.expense} /></Panel>
        <Panel title="How you paid"><Bars rows={byMode} total={s.expense} /></Panel>
      </div>
      <Panel title="Paid from" description="Accounts and cards that funded your spending"><Bars rows={byAccount} total={s.expense} /></Panel>
      <div className="flex justify-end"><Button variant="outline" onClick={() => exportTxCsv(list, ym)} disabled={!list.length}><Download className="mr-1.5 h-4 w-4" />Export this month (CSV)</Button></div>
    </div>
  )
}
