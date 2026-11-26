'use client'

import { toastProblem } from '@/lib/notify'
import { shortAccountName } from '@/lib/wealth/accountName'
import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, CheckSquare, ChevronLeft, ChevronRight, Copy, MoreVertical, Pencil, Plus, Scale, Search, SlidersHorizontal, Split, Star, Trash2, X } from 'lucide-react'
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
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import { useKeys } from '@/lib/hooks/useKeys'
import { matchesAll } from '@/lib/search'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { expenseParts } from '@/lib/wealth/splits'
import { childOf, cleanName, groupCategories, makeSub, parentOf } from '@/lib/wealth/subcategories'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CHART_PALETTE, DateInput, Empty, Panel, Select, chartTooltipStyle, InfoTip } from '../kit'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { cn } from '@/lib/utils'

export interface Tx { key: string; kind: 'expense' | 'income' | 'transfer'; id: string; date: string; amount: number; category: string; title: string; sub: string; legacy?: boolean; raw: any }


/** The month in one plain row, as a money manager shows it: income, expenses and the total, each in its own colour. */
export function MonthTotals({ list }: { list: Tx[] }) {
  const s = monthSummary(list as any)
  return (
    <dl className="surface-card grid grid-cols-3 divide-x divide-border px-2 py-3 text-center" aria-label="This month">
      <div className="px-2"><dt className="text-xs text-muted-foreground">Income</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-income"><Money value={s.income} compact /></dd></div>
      <div className="px-2"><dt className="text-xs text-muted-foreground">Expenses</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-expense"><Money value={s.expense} compact /></dd></div>
      <div className="px-2"><dt className="text-xs text-muted-foreground">Total</dt><dd className={cn('mt-0.5 text-base font-semibold tabular-nums', s.net < 0 && 'text-expense')}><Money value={s.net} compact signed /></dd></div>
    </dl>
  )
}

/** Income, expenses and what is left. Each card opens that month's log: the income entries, the expenses, or everything. */
export function SummaryStrip({ list, onOpen }: { list: Tx[]; onOpen?: (kind: 'income' | 'expense' | 'all') => void }) {
  const s = monthSummary(list as any)
  const count = (k: Tx['kind']) => list.filter((t) => t.kind === k).length
  const saved = s.income > 0 ? Math.round((s.net / s.income) * 100) : null
  const cards = [
    { key: 'income', open: 'income' as const, label: 'Income', icon: ArrowDownLeft, value: <Money value={s.income} />, hint: `${count('income')} ${count('income') === 1 ? 'entry' : 'entries'} this month`, chip: 'bg-success/25 text-foreground', tint: 'success', bar: '!border-success/60' },
    { key: 'expense', open: 'expense' as const, label: 'Expenses', icon: ArrowUpRight, value: <Money value={s.expense} />, hint: `${count('expense')} ${count('expense') === 1 ? 'expense' : 'expenses'} this month`, chip: 'bg-destructive/25 text-foreground', tint: 'destructive', bar: '!border-destructive/60' },
    { key: 'net', open: 'all' as const, label: s.net < 0 ? 'Overspent' : 'Saved', icon: Scale, value: <Money value={s.net} signed />, hint: saved === null ? 'No income recorded yet' : `${saved}% of income`, chip: s.net < 0 ? 'bg-destructive/25 text-foreground' : 'bg-primary/30 text-foreground', tint: s.net < 0 ? 'destructive' : 'primary', bar: s.net < 0 ? '!border-destructive/60' : '!border-primary/60' },
  ]
  // Swipeable on phones, three across from tablet up. Every figure is the month's real total.
  return (
    <SnapCarousel label="Month summary" cols={3} itemWidth="w-[72%]">
      {cards.map((c) => (
        <button key={c.key} type="button" disabled={!onOpen} onClick={() => onOpen?.(c.open)} aria-label={`${c.label}: show the ${c.open === 'all' ? 'transactions' : c.open === 'income' ? 'income entries' : 'expenses'}`} style={{ background: `color-mix(in srgb, hsl(var(--${c.tint})) 32%, hsl(var(--card)))` }} className={cn('surface-card relative flex h-full w-full flex-col justify-between overflow-hidden p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', onOpen && 'transition-transform active:scale-[0.99]', c.bar)}>
          <div className="flex items-center gap-2">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', c.chip)}><c.icon className="h-4 w-4" aria-hidden /></span>
            <p className="text-sm font-medium">{c.label}</p>
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums [&_*]:!text-foreground">{c.value}</p>
          <p className="mt-1 text-xs opacity-80">{c.hint}</p>
        </button>
      ))}
    </SnapCarousel>
  )
}

function Row({ t, onEdit, onDelete, onDuplicate, onSplit, onBookmark, selecting, selected, onToggle, onLongPress }: {
  t: Tx; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void; onDuplicate?: (t: Tx) => void; onSplit?: (t: Tx) => void
  onBookmark?: (t: Tx, on: boolean) => void; selecting?: boolean; selected?: boolean; onToggle?: (t: Tx) => void; onLongPress?: (t: Tx) => void
}) {
  const starred = !!t.raw?.bookmarked
  return (
    <TxnRow layout="money" kind={t.kind} title={t.title} category={t.category} amount={t.amount} selected={selected}
      // the category is already shown at the left, so this line is what is not: the split, the way it was paid, or the account
      meta={t.kind === 'expense' ? (expenseParts(t.raw).length > 1 ? 'Split: ' + expenseParts(t.raw).map((p) => `${String(p.category).split(' > ').pop()} ${formatINR(p.amount)}`).join(', ') : modeLabel(t.raw.mode)) : t.kind === 'income' ? (t.sub.split(' · ').slice(1).join(' · ') || t.sub) : t.sub}
      onLongPress={onLongPress && !selecting ? () => onLongPress(t) : undefined}
      onSwipeLeft={!selecting && !t.legacy ? { label: 'Delete', run: () => onDelete(t) } : undefined}
      onSwipeRight={!selecting && t.kind === 'expense' ? { label: 'Edit', run: () => onEdit(t) } : undefined}
      leading={selecting ? <Checkbox checked={!!selected} onChange={() => onToggle?.(t)} aria-label={`Select ${t.title}`} /> : undefined}
      actions={selecting ? undefined : <>
        {/* phone: one "more" menu (swipe also edits and deletes); desktop keeps the row of buttons */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" aria-label={`Actions for ${t.title}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {t.kind === 'expense' && <DropdownMenuItem onClick={() => onEdit(t)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
            {onBookmark && <DropdownMenuItem onClick={() => onBookmark(t, !starred)}><Star className={cn('mr-2 h-4 w-4', starred && 'fill-current')} />{starred ? 'Remove bookmark' : 'Bookmark'}</DropdownMenuItem>}
            {t.kind === 'expense' && onDuplicate && <DropdownMenuItem onClick={() => onDuplicate(t)}><Copy className="mr-2 h-4 w-4" />Duplicate</DropdownMenuItem>}
            {t.kind === 'expense' && onSplit && <DropdownMenuItem onClick={() => onSplit(t)}><Split className="mr-2 h-4 w-4" />Split across categories</DropdownMenuItem>}
            {!t.legacy && <DropdownMenuItem onClick={() => onDelete(t)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="flex items-center max-md:hidden">
        {onBookmark && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={starred ? 'Remove bookmark' : 'Bookmark'} aria-pressed={starred} onClick={() => onBookmark(t, !starred)}><Star className={cn('h-4 w-4', starred && 'fill-[hsl(var(--highlight))] text-[hsl(85_60%_30%)] dark:text-highlight')} /></Button>}
        {t.kind === 'expense' && onDuplicate && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Duplicate expense" title="Duplicate" onClick={() => onDuplicate(t)}><Copy className="h-4 w-4" /></Button>}
        {t.kind === 'expense' && onSplit && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Split expense across categories" title="Split across categories" onClick={() => onSplit(t)}><Split className="h-4 w-4" /></Button>}
        {t.kind === 'expense' && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Edit expense" onClick={() => onEdit(t)}><Pencil className="h-4 w-4" /></Button>}
        {!t.legacy && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Delete ${t.kind}`} onClick={() => onDelete(t)}><Trash2 className="h-4 w-4" /></Button>}
        </span>
      </>} />
  )
}


/** Daily view: transactions grouped by date with day totals, search, filters, bookmarks and multi-select. */
export function TransactionsView({ initialCategory = '', initialKind = 'all', list, ym, onEdit, onDelete, onAdd, onDuplicate, onSplit, onBookmark, onBulkDelete, onImport }: {
  onImport?: () => void
  /** open already filtered to one category (a parent category includes its sub-categories) */
  initialCategory?: string
  /** open already showing only income, only expenses or only transfers */
  initialKind?: 'all' | 'expense' | 'income' | 'transfer'
  list: Tx[]; ym: string; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void; onAdd: () => void; onDuplicate?: (t: Tx) => void; onSplit?: (t: Tx) => void
  onBookmark?: (items: Tx[], on: boolean) => void; onBulkDelete?: (items: Tx[]) => void
}) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | Tx['kind']>(initialKind)
  const [cat, setCat] = useState(initialCategory)
  const [acct, setAcct] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data: wd } = useWealth()
  const accountName = (t: Tx) => { const r = t.raw || {}; const id = r.accountId || r.cardId || r.fromId; const a = wd.bankAccounts.find((x: any) => x.id === id) || wd.cards.find((x: any) => x.id === id); return a ? (a.nickname || a.bankName || `${a.bank} ${a.cardName}`) : '' }
  const [onlyStar, setOnlyStar] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const cats = useCategories()
  const allCats = useMemo(() => [...new Set([...cats.expense, ...cats.income])], [cats])

  const shown = useMemo(() => list.filter((t) => (kind === 'all' || t.kind === kind) && (!cat || t.category === cat || parentOf(t.category) === cat) && (!acct || t.raw?.accountId === acct || t.raw?.cardId === acct || t.raw?.fromId === acct || t.raw?.toId === acct) && (!from || t.date >= from) && (!to || t.date <= to) && (!onlyStar || t.raw?.bookmarked) && matchesAll(q, t.title, t.sub, t.category, t.amount, t.date, t.raw?.note, accountName(t))), [list, kind, cat, acct, from, to, q, onlyStar])
  const pg = usePagination(shown, { pageSize: 25, resetKey: `${ym}|${kind}|${cat}|${acct}|${from}|${to}|${q}|${onlyStar}` })
  const groups = useMemo(() => groupByDay(pg.slice as any) as unknown as { date: string; items: Tx[]; income: number; expense: number }[], [pg.slice])
  const starCount = useMemo(() => list.filter((t) => t.raw?.bookmarked).length, [list])

  const chosen = shown.filter((t) => picked.has(t.key))
  const toggle = (t: Tx) => setPicked((p) => { const n = new Set(p); n.has(t.key) ? n.delete(t.key) : n.add(t.key); return n })
  const begin = (t?: Tx) => { setSelecting(true); setPicked(t ? new Set([t.key]) : new Set()) }
  const stop = () => { setSelecting(false); setPicked(new Set()) }
  // J and K step through the pages, S starts or ends selecting
  useKeys({ j: () => pg.setPage(Math.min(pg.pageCount, pg.page + 1)), k: () => pg.setPage(Math.max(1, pg.page - 1)), s: () => (selecting ? stop() : begin()) })
  const allOn = shown.length > 0 && chosen.length === shown.length
  const everyStarred = chosen.length > 0 && chosen.every((t) => t.raw?.bookmarked)

  return (
    <div className="space-y-4">
      <MonthTotals list={list} />
      {/* kinds as plain tabs; search, filters, bookmarks and select are small icons, so the list stays the main thing */}
      <div className="flex items-end justify-between gap-2 border-b border-border">
        <div role="tablist" aria-label="Show" className="flex gap-4">
          {(['all', 'income', 'expense', 'transfer'] as const).map((k) => <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={cn('-mb-px min-h-10 border-b-2 px-0.5 text-sm font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring', kind === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{k === 'all' ? 'All' : k}</button>)}
        </div>
        <div className="flex items-center pb-0.5">
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-pressed={searchOpen} aria-label="Search" onClick={() => setSearchOpen((v) => !v)}><Search className={cn('h-[18px] w-[18px]', (searchOpen || q) && 'text-primary')} /></Button>
          <Button variant="ghost" size="icon" className="relative h-10 w-10" aria-pressed={filtersOpen} aria-label="Filters" onClick={() => setFiltersOpen((v) => !v)}><SlidersHorizontal className={cn('h-[18px] w-[18px]', (filtersOpen || acct || from || to || cat) && 'text-primary')} />{(acct || from || to || cat) && <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />}</Button>
        </div>
      </div>
      {searchOpen && <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus aria-label="Search transactions" className="h-11 pl-9" placeholder="Search description, category" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
      {filtersOpen && (
        <div className="grid items-end gap-2 [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))]">
          <div className="flex flex-wrap gap-2 [grid-column:1/-1]">
            <Button type="button" variant={onlyStar ? 'default' : 'outline'} size="sm" aria-pressed={onlyStar} onClick={() => setOnlyStar((v) => !v)}><Star className={cn('mr-1.5 h-4 w-4', onlyStar && 'fill-current')} />Bookmarked ({starCount})</Button>
            <Button type="button" variant={selecting ? 'default' : 'outline'} size="sm" aria-pressed={selecting} disabled={!shown.length && !selecting} onClick={() => (selecting ? stop() : begin())}><CheckSquare className="mr-1.5 h-4 w-4" />{selecting ? 'Done selecting' : 'Select'}</Button>
          </div>
          <label className="min-w-0 text-xs text-muted-foreground">Category<div className="mt-0.5"><Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{allCats.map((c) => <option key={c}>{c}</option>)}</Select></div></label>
          <label className="min-w-0 text-xs text-muted-foreground">Account or card
            <div className="mt-0.5"><Select aria-label="Account or card" value={acct} onChange={(e) => setAcct(e.target.value)}>
              <option value="">All accounts and cards</option>
              {wd.bankAccounts.map((a: any) => <option key={a.id} value={a.id}>{shortAccountName(a, wd.bankAccounts)}</option>)}
              {wd.cards.map((x: any) => <option key={x.id} value={x.id}>{x.bank} {x.cardName}</option>)}
            </Select></div>
          </label>
          <label className="min-w-0 text-xs text-muted-foreground">From<div className="mt-0.5"><DateInput aria-label="From date" min={`${ym}-01`} max={to || `${ym}-31`} value={from} onChange={(e) => setFrom(e.target.value)} /></div></label>
          <label className="min-w-0 text-xs text-muted-foreground">To<div className="mt-0.5"><DateInput aria-label="To date" min={from || `${ym}-01`} max={`${ym}-31`} value={to} onChange={(e) => setTo(e.target.value)} /></div></label>
          <div className="flex items-center justify-between gap-3 [grid-column:1/-1]">
            <span className="text-xs tabular-nums text-muted-foreground">{shown.length} of {list.length}</span>
            {(acct || from || to || cat || kind !== 'all' || q || onlyStar) && <Button type="button" variant="ghost" size="sm" onClick={() => { setAcct(''); setFrom(''); setTo(''); setCat(''); setKind('all'); setQ(''); setOnlyStar(false) }}>Clear filters</Button>}
          </div>
        </div>
      )}
      {groups.length === 0 ? <Empty title={onlyStar ? 'No bookmarked transactions this month' : list.length ? 'No matches' : 'No transactions this month'} description={onlyStar ? 'Tap the star on a transaction to keep it handy.' : undefined} action={!list.length ? <Button onClick={onAdd}><Plus className="mr-1.5 h-4 w-4" />Add transaction</Button> : undefined} /> : (
        <div className={cn('surface-card overflow-hidden', selecting && 'mb-24')}>
          {groups.map((g) => (
            <section key={g.date}>
              <header className="flex items-center justify-between gap-3 border-y border-border bg-muted/50 px-4 py-1.5 first:border-t-0">
                <span className="flex items-center gap-2">
                  <span className="text-xl font-semibold tabular-nums leading-none">{g.date.slice(8, 10)}</span>
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">{new Date(g.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{new Date(g.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long' })}, {g.date.slice(0, 4)}</span>
                </span>
                <span className="flex gap-3 text-xs font-medium tabular-nums">{g.income > 0 && <span className="text-income">+{formatINR(g.income)}</span>}{g.expense > 0 && <span className="text-expense">-{formatINR(g.expense)}</span>}</span>
              </header>
              <ul className="divide-y divide-border px-4">{g.items.map((t) => <Row key={t.key} t={t} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onSplit={onSplit} onBookmark={onBookmark ? (x, on) => onBookmark([x], on) : undefined} selecting={selecting} selected={picked.has(t.key)} onToggle={toggle} onLongPress={begin} />)}</ul>
            </section>
          ))}
        </div>
      )}

      <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} from={pg.from} to={pg.to} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} label="Transactions pages" />

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
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(['expense', 'income'] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring', kind === k ? 'bg-card shadow-card' : 'text-muted-foreground')}>{k === 'expense' ? 'Expenses' : 'Income'}</button>)}
        </div>}>
        {rows.length === 0 ? <Empty title={`No ${kind === 'expense' ? 'expenses' : 'income'} this month`} /> : (
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="relative h-52 w-52 shrink-0">
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
          <DrillList items={list.filter((t) => t.kind === kind && t.category === picked)} />
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
  const groups = groupCategories(cats[kind])
  const list = groups.flatMap((g) => [g.name, ...g.children])
  const [parent, setParent] = useState('')
  const stored = !!data.meta.find((m: any) => m.key === 'categories')
  const used = (c: string) => (kind === 'expense' ? data.expenses.filter((e: any) => e.category === c).length : data.bankTxns.filter((t: any) => t.type === 'income' && t.category === c).length)
  const init = async () => { if (!stored) await saveCategories(db, { expense: cats.expense, income: cats.income }) }
  const run = async (fn: () => Promise<void>) => { try { await init(); await fn() } catch (e) { toastProblem(e, 'Failed') } }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><div className="flex items-center gap-2"><DialogTitle>Categories</DialogTitle><InfoTip label="Details">Renaming updates past entries. Deleting moves its entries to “Other”.</InfoTip></div><DialogDescription className="sr-only">Renaming updates past entries. Deleting moves its entries to “Other”.</DialogDescription></DialogHeader>
        <div role="tablist" aria-label="Category type" className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
          {(['expense', 'income'] as const).map((k) => <button key={k} role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setEditing(null) }} className={cn('rounded-md py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring', kind === k ? 'bg-card shadow-card' : 'text-muted-foreground')}>{k === 'expense' ? 'Expense' : 'Income'}</button>)}
        </div>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); const base = cleanName(name); if (!base) return; const n = parent ? makeSub(parent, base) : base; if (list.some((c) => c.toLowerCase() === n.toLowerCase())) return void toast.error('That category already exists'); run(async () => { await saveCategories(db, { expense: kind === 'expense' ? [...cats.expense, n] : cats.expense, income: kind === 'income' ? [...cats.income, n] : cats.income }); setName('') }) }}>
          <div className="w-full sm:w-36 sm:shrink-0"><Select aria-label="Add under" value={parent} onChange={(e) => setParent(e.target.value)}><option value="">Main category</option>{groups.map((g) => <option key={g.name} value={g.name}>Under {g.name}</option>)}</Select></div><Input aria-label={parent ? `New sub category under ${parent}` : 'New category'} placeholder={parent ? `New sub category of ${parent}` : `New ${kind} category`} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} /><Button type="submit" className="sm:shrink-0" disabled={!cleanName(name)}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </form>
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {list.map((c) => (
            <li key={c} className={cn('flex items-center justify-between gap-2 py-2 text-sm', childOf(c) && 'pl-5')}>
              {editing?.from === c ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); const to = editing.to; const clean = cleanName(to); if (!clean) return; run(async () => { if (childOf(c)) await renameCategory(db, kind, c, makeSub(parentOf(c), clean)); else { await renameCategory(db, kind, c, clean); for (const k of list.filter((x) => parentOf(x) === c && childOf(x))) await renameCategory(db, kind, k, makeSub(clean, childOf(k)!)) } setEditing(null); toast.success('Renamed') }) }}>
                  <Input aria-label={`Rename ${c}`} autoFocus value={editing.to} maxLength={30} onChange={(e) => setEditing({ from: c, to: e.target.value })} /><Button type="submit" size="sm">Save</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 truncate">{childOf(c) ?? c}<span className="ml-2 text-xs text-muted-foreground">{used(c)} entr{used(c) === 1 ? 'y' : 'ies'}</span></span>
                  <span className="flex shrink-0"><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Rename ${c}`} onClick={() => setEditing({ from: c, to: childOf(c) ?? c })}><Pencil className="h-3.5 w-3.5" /></Button>
                    {c !== 'Other' && <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${c}`} onClick={() => setDel(c)}><Trash2 className="h-3.5 w-3.5" /></Button>}</span>
                </>
              )}
            </li>
          ))}
        </ul>
        <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete “${del}”?`} description={`${del ? used(del) : 0} entries will move to “Other”${del && list.some((x) => childOf(x) && parentOf(x) === del) ? ', and so will those of its sub categories, which are deleted too' : ''}.`} confirmLabel="Delete" variant="destructive" onConfirm={() => run(async () => { for (const k of list.filter((x) => childOf(x) && parentOf(x) === del)) await deleteCategory(db, kind, k); await deleteCategory(db, kind, del!); setDel(null); toast.success('Deleted') })} />
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
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: CHART_PALETTE[i % CHART_PALETTE.length] }} /></div>
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
    return a ? shortAccountName(a, data.bankAccounts) : 'Not linked'
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
    </div>
  )
}

/** The entries of one category for the month, paged so a busy category never renders hundreds of rows at once. */
function DrillList({ items }: { items: Tx[] }) {
  const pg = usePagination(items, { pageSize: 15, resetKey: String(items.length) })
  return (
    <>
      <ul className="divide-y divide-border">{pg.slice.map((t) => <TxnRow key={t.key} kind={t.kind} title={t.title} category={t.category} meta={`${t.sub} · ${formatDate(t.date)}`} amount={t.amount} />)}</ul>
      <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} from={pg.from} to={pg.to} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} label="Category entries pages" />
    </>
  )
}
