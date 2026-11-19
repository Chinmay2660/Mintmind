'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FileUp, Plus, Settings2, Tags, TriangleAlert, Wand2 } from 'lucide-react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { useKeys } from '@/lib/hooks/useKeys'
import { RecurringView } from '@/components/wealth/budget/RecurringView'
import { SubscriptionsPanel } from '@/components/wealth/budget/Subscriptions'
import { ReviewView } from '@/components/wealth/budget/ReviewView'
import { CashFlowView } from '@/components/wealth/budget/CashFlowView'
import { BudgetList } from '@/components/wealth/budget/BudgetList'
import { expenseParts } from '@/lib/wealth/splits'
import { SplitDialog } from '@/components/wealth/budget/SplitDialog'
import { RulesDialog } from '@/components/wealth/budget/RulesDialog'
import { ImportCsvDialog } from '@/components/wealth/budget/ImportCsvDialog'
import { toast } from 'sonner'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deleteExpense, deleteIncome, deleteTransfer, save, setBookmarks } from '@/lib/wealth/actions'
import { addMonths, availableBalance, budgetPacing, round2, toISO } from '@/lib/wealth/calc'
import { useCategories } from '@/lib/wealth/useCategories'
import { buildTransactions, inMonth } from '@/lib/wealth/transactions'
import { TxnEntryDialog, type TxnType } from '@/components/wealth/budget/TxnEntryDialog'
import { CalendarView, CategoryManager, MonthlyView, StatsView, SummaryStrip, SummaryView, TransactionsView, type Tx } from '@/components/wealth/budget/Views'
import { MonthPicker } from '@/components/ui/pickers'
import { categoryTotals, monthKey, monthTotal } from '@/lib/wealth/selectors'
import { formatCompactINR, formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, InfoTip, Metric, Progress, Select, Stat, chartAxis, chartColor, chartGrid, chartTooltipStyle, toneForPct, UsagePct } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { DateInput } from '@/components/ui/pickers'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { TabBar } from '@/components/ui/tab-bar'
import { Checkbox } from '@/components/ui/checkbox'

const TAB_ORDER = ['overview', 'budgets', 'transactions', 'calendar', 'monthly', 'summary', 'recurring', 'stats', 'cashflow', 'review'] as const

export default function BudgetPage() {
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const today = useMemo(() => new Date(), [])
  const curYm = toISO(today).slice(0, 7)
  const [ym, setYm] = useState(curYm)
  const [dlg, setDlg] = useState<null | { kind: 'budget' | 'categories' | 'txn' | 'del' | 'delmany'; row?: any; draft?: any; type?: TxnType; tx?: Tx; txs?: Tx[] }>(null)
  const [tab, setTab] = useState<'overview' | 'budgets' | 'transactions' | 'calendar' | 'monthly' | 'summary' | 'recurring' | 'stats' | 'cashflow' | 'review'>('overview')
  const { expense: EXPENSE_CATEGORIES } = useCategories()
  const [catFilter, setCatFilter] = useState('')

  const budget = data.budgets.find((b) => b.id === ym)
  const prevYm = addMonths(`${ym}-01`, -1).slice(0, 7)
  const prevBudget = data.budgets.find((b) => b.id === prevYm)

  // Monthly reset: a new month starts with last month's budget template (spending naturally starts from zero).
  useEffect(() => {
    if (!ready || !db) return
    if (!data.budgets.some((b) => b.id === curYm)) {
      const prev = [...data.budgets].sort((a, b) => b.id.localeCompare(a.id))[0]
      if (prev) save(db, 'budgets', { id: curYm, total: prev.total, categories: prev.categories, rollover: prev.rollover, rolloverCats: prev.rolloverCats || [], periods: Object.fromEntries(Object.entries(prev.periods || {}).filter(([, p]) => p !== 'custom')) })
    }
  }, [ready, db, data.budgets, curYm])

  const carry = useMemo(() => {
    if (!budget?.rollover || !prevBudget) return 0
    return Math.max(round2(prevBudget.total - monthTotal(data.expenses, prevYm)), 0)
  }, [budget, prevBudget, data.expenses, prevYm])

  const [year, month] = ym.split('-').map(Number)
  const effective = (budget?.total ?? 0) + carry
  // Pacing scope: the whole month, or one category (its own limit, daily budget, pace line and projection)
  const catLimit = catFilter ? Number(budget?.categories?.[catFilter]) || 0 : 0
  const scopeBudget = catFilter ? catLimit : effective
  const scopeExpenses = useMemo(() => (catFilter ? data.expenses.flatMap((e) => expenseParts(e).filter((p) => p.category === catFilter).map((p) => ({ ...e, amount: p.amount }))) : data.expenses), [data.expenses, catFilter])
  const p = useMemo(() => (budget ? budgetPacing({ budget: scopeBudget, expenses: scopeExpenses, year, month, today }) : null), [budget, scopeBudget, scopeExpenses, year, month, today])
  const cats = useMemo(() => categoryTotals(data.expenses, ym), [data.expenses, ym])
  const prevTotal = monthTotal(scopeExpenses, prevYm)
  const allTx = useMemo(() => buildTransactions({ expenses: data.expenses, bankTxns: data.bankTxns, transfers: data.transfers, bankAccounts: data.bankAccounts, cards: data.cards }) as unknown as Tx[], [data.expenses, data.bankTxns, data.transfers, data.bankAccounts, data.cards])
  const reviewCount = useMemo(() => allTx.filter((t: any) => t.raw?.needsReview).length, [allTx])
  const monthTx = useMemo(() => inMonth(allTx as any, ym) as unknown as Tx[], [allTx, ym])
  const edit = (t: Tx) => setDlg({ kind: 'txn', row: t.raw })
  const [splitFor, setSplitFor] = useState<any>(null)
  // Duplicate: opens the entry sheet pre-filled with this expense (today's date) so a repeat purchase is two taps.
  const duplicate = (t: Tx) => setDlg({ kind: 'txn', type: 'expense', draft: { ...t.raw, date: undefined } })
  const bookmark = (items: Tx[], on: boolean) => setBookmarks(db, items.map((t) => ({ kind: t.kind, id: t.id, legacy: t.legacy })), on).then(() => toast.success(on ? 'Bookmarked' : 'Bookmark removed')).catch(() => toast.error('Could not update bookmarks'))
  const [rulesOpen, setRulesOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  useAddParam((what) => { if (what === 'categories') setDlg({ kind: 'categories' }) })
  useEffect(() => { const open = () => setDlg({ kind: 'categories' }); window.addEventListener('mm:open-categories', open); return () => window.removeEventListener('mm:open-categories', open) }, [])
  const swipe = useRef<{ x: number; y: number } | null>(null)
  useKeys({
    '1': () => setTab('overview'), '2': () => setTab('budgets'), '3': () => setTab('transactions'), '4': () => setTab('calendar'), '5': () => setTab('monthly'), '6': () => setTab('summary'), '7': () => setTab('recurring'), '8': () => setTab('stats'), '9': () => setTab('cashflow'), '0': () => setTab('review'),
    '[': () => setYm((cur) => addMonths(`${cur}-01`, -1).slice(0, 7)),
    ']': () => setYm((cur) => { const next = addMonths(`${cur}-01`, 1).slice(0, 7); return next > curYm ? cur : next }),
  })
  const step = (by: number) => setYm((cur) => { const next = addMonths(`${cur}-01`, by).slice(0, 7); return next > curYm ? cur : next })
  const askDelete = (t: Tx) => setDlg({ kind: 'del', tx: t })
  if (!ready) return <LoadingBlock className="h-64" />

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const alerts: string[] = []
  if (p && budget) {
    if (p.utilisation >= 100) alerts.push(`You have exceeded this month's budget by ${formatINR(Math.abs(p.remaining))}.`)
    else if (p.utilisation >= 90) alerts.push(`${p.utilisation}% of the budget is used.`)
    if (ym === curYm && p.status === 'over' && p.utilisation < 100) alerts.push(`Spending is ${formatINR(p.variance)} ahead of the daily pace.`)
    if (ym === curYm && p.projectedOver > 0) alerts.push(`At this rate you will end the month about ${formatINR(p.projectedOver)} over budget.`)
    for (const [c, lim] of Object.entries<number>(budget.categories || {})) if (lim > 0 && (cats[c] || 0) > lim) alerts.push(`${c} is over its category budget (${formatINR(cats[c])} of ${formatINR(lim)}).`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <>
            <div className="flex w-full items-center justify-center gap-1 sm:w-auto sm:justify-start">
              <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setYm(prevYm)}><ChevronLeft className="h-4 w-4" /></Button>
              <MonthPicker value={ym} max={curYm} onChange={setYm} className="min-w-32 justify-center" />
              <Button variant="outline" size="icon" aria-label="Next month" disabled={ym >= curYm} onClick={() => setYm(addMonths(`${ym}-01`, 1).slice(0, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" onClick={() => setDlg({ kind: 'categories' })}><Tags className="mr-1.5 h-4 w-4" />Categories</Button>
            <Button variant="outline" onClick={() => setRulesOpen(true)}><Wand2 className="mr-1.5 h-4 w-4" />Rules</Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}><FileUp className="mr-1.5 h-4 w-4" />Import CSV</Button>
            <Button variant="outline" onClick={() => setDlg({ kind: 'budget' })}><Settings2 className="mr-1.5 h-4 w-4" />Budget</Button>
          </>
        }
        primaryAction={{ label: 'Add transaction', onClick: () => setDlg({ kind: 'txn', type: 'expense' }) }}
      />

      {alerts.length > 0 && (
        <div role="status" className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          {alerts.map((a) => <p key={a} className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{a}</p>)}
        </div>
      )}

      <TabBar label="Budget views" tabs={[{ key: 'overview', label: 'Overview' }, { key: 'budgets', label: 'Budgets' }, { key: 'transactions', label: 'Transactions' }, { key: 'calendar', label: 'Calendar' }, { key: 'monthly', label: 'Monthly' }, { key: 'summary', label: 'Summary' }, { key: 'recurring', label: 'Recurring' }, { key: 'stats', label: 'Stats' }, { key: 'cashflow', label: 'Cash flow' }, { key: 'review', label: reviewCount ? `Review (${reviewCount})` : 'Review' }]} value={tab} onChange={(k) => setTab(k as typeof tab)} />

      {/* Swipe sideways to move between tabs. Months have their arrows and the [ ] keys. Scrollers, sliders, fields and swipeable rows keep their own gestures. */}
      <div className="space-y-5"
        onTouchStart={(e) => { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY } }}
        onTouchEnd={(e) => {
          const st = swipe.current; swipe.current = null
          if (!st) return
          if ((e.target as HTMLElement).closest('[role="region"], [role="tablist"], [role="slider"], [data-swipe-row], input, textarea, [role="dialog"]')) return
          const t = e.changedTouches[0]; const dx = t.clientX - st.x; const dy = t.clientY - st.y
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) { const i = TAB_ORDER.indexOf(tab); const n = TAB_ORDER[i + (dx < 0 ? 1 : -1)]; if (n) setTab(n) }
        }}>
      {tab === 'transactions' && <TransactionsView list={monthTx} ym={ym} onEdit={edit} onDelete={askDelete} onDuplicate={duplicate} onSplit={(t) => setSplitFor(t.raw)} onBookmark={bookmark} onBulkDelete={(txs) => setDlg({ kind: 'delmany', txs })} onAdd={() => setDlg({ kind: 'txn', type: 'expense' })} />}
      {tab === 'calendar' && <CalendarView list={monthTx} ym={ym} onEdit={edit} onDelete={askDelete} onDuplicate={duplicate} onBookmark={bookmark} />}
      {tab === 'monthly' && <MonthlyView all={allTx} ym={ym} curYm={curYm} onPick={(k) => { setYm(k); setTab('transactions') }} />}
      {tab === 'summary' && <SummaryView list={monthTx} ym={ym} />}
      {tab === 'recurring' && <div className="space-y-5"><SubscriptionsPanel /><RecurringView expenses={data.expenses} /></div>}
      {tab === 'stats' && <StatsView list={monthTx} />}
      </div>

      {tab === 'review' && <ReviewView list={allTx} onEdit={edit} />}
      {tab === 'cashflow' && <CashFlowView list={allTx as any[]} ym={ym} />}
      {tab === 'budgets' && <BudgetList budget={budget ? { ...budget, total: effective } : budget} prevBudget={prevBudget} expenses={data.expenses} ym={ym} today={today} onEdit={() => setDlg({ kind: 'budget' })} />}
      {tab === 'overview' && (!budget || !p ? (
        <Empty title={`No budget for ${monthName}`} description="Set a monthly budget to see daily pacing and projections." action={<Button onClick={() => setDlg({ kind: 'budget' })}>Set budget</Button>} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="budget-scope" className="text-sm font-medium">Showing</label>
            <Select id="budget-scope" className="w-auto" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {catFilter && catLimit === 0 && <span className="text-xs text-warning">No limit set for {catFilter}. Set one under Budget to see its daily pace.</span>}
          </div>
          <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-4 border-b border-border pb-5">
            <Stat label={catFilter ? `${catFilter} budget` : 'Monthly budget'} value={<Money value={scopeBudget} />} hint={!catFilter && carry > 0 ? `incl. ${formatINR(carry)} rolled over` : `${p.days} days`} />
            <Stat label="Spent" value={<Money value={p.spent} />} hint={<span className="flex flex-wrap items-center gap-x-2"><span><UsagePct value={p.utilisation} warnAt={70} highAt={90} /> used</span><Metric amount={p.spent - prevTotal} invertGood className="text-xs" hint="No spending last month" /></span>} />
            <Stat label="Remaining" value={<span className={p.remaining < 0 ? 'text-destructive' : ''}><Money value={p.remaining} /></span>} hint={p.remainingDays > 0 ? `${formatINR(p.safeDailySpend)}/day safe to spend` : undefined} />
            <Stat label={catFilter ? `${catFilter} daily budget` : 'Daily budget'} value={<Money value={p.dailyBudget} decimals />} hint={catFilter ? 'category limit ÷ days in month' : 'budget ÷ days in month'} />
            <Stat label={`Expected by ${ym === curYm ? 'today' : 'month end'}`} value={<Money value={p.expectedTillToday} />} hint="Pace line, not remaining" />
            <Stat label={p.variance > 0 ? 'Over pace by' : 'Under pace by'} value={<span className={p.variance > 0 ? 'text-destructive' : 'text-success'}><Money value={Math.abs(p.variance)} /></span>} />
            <Stat label="Projected month-end" value={<Money value={p.projected} />} hint={p.projectedOver > 0 ? `${formatINR(p.projectedOver)} over` : 'within budget'} />
            <Stat label="Change vs last month" info="Spending this month against the whole of last month. Lower is better." value={<Metric amount={p.spent - prevTotal} pct={prevTotal > 0 ? ((p.spent - prevTotal) / prevTotal) * 100 : null} invertGood className="text-lg font-semibold sm:text-xl" />} hint={`Last month ${formatINR(prevTotal)}`} />
          </div>

          <Panel title={catFilter ? `Daily pacing: ${catFilter}` : 'Daily pacing'}>
            <div className="h-72" role="img" aria-label="Expected versus actual cumulative spending line chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={p.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="day" {...chartAxis} label={{ value: 'Day of month', position: 'insideBottom', offset: -2, fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} height={36} />
                  <YAxis {...chartAxis} width={52} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                  <Tooltip {...chartTooltipStyle} labelFormatter={(d) => `Day ${d}`} formatter={(v: number, n: string) => [privacyMode ? '••••' : formatINR(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={scopeBudget} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Budget', fill: 'hsl(var(--muted-foreground))', fontSize: 11, position: 'insideTopRight' }} />
                  {ym === curYm && <ReferenceLine x={p.dayToday} stroke="hsl(var(--border))" />}
                  <Line type="monotone" dataKey="expected" name="Expected cumulative" stroke={chartColor(2)} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                  <Line type="monotone" dataKey="actual" name="Actual cumulative" stroke={chartColor(3)} strokeWidth={2.5} dot={false} connectNulls={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Category budgets">
            <ul className="grid gap-4 sm:grid-cols-2">
              {EXPENSE_CATEGORIES.map((c) => {
                const lim = Number(budget.categories?.[c]) || 0
                const sp = cats[c] || 0
                const pct = lim > 0 ? (sp / lim) * 100 : 0
                return (
                  <li key={c}>
                    <div className="mb-1 flex justify-between text-sm"><button type="button" className={cn('font-medium hover:text-primary', catFilter === c && 'text-primary')} onClick={() => setCatFilter(catFilter === c ? '' : c)} aria-pressed={catFilter === c}>{c}</button><span className="text-muted-foreground"><Money value={sp} compact /> / {lim ? <Money value={lim} compact /> : 'no limit'}</span></div>
                    <Progress value={lim ? pct : 0} tone={toneForPct(pct)} label={`${c} budget used`} />
                    {lim > 0 && <p className="mt-1 text-xs text-muted-foreground">{formatINR(Math.round((lim / p.days) * 100) / 100, { decimals: true })}/day · {formatINR(Math.max(lim - sp, 0))} left</p>}
                  </li>
                )
              })}
            </ul>
          </Panel>
        </>
      ))}

      {tab === 'overview' && <SummaryStrip list={monthTx} />}

      {dlg?.kind === 'budget' && <BudgetForm ym={ym} row={budget} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'budgets', r); toast.success('Budget saved') }} />}
      {dlg?.kind === 'categories' && <CategoryManager onClose={() => setDlg(null)} />}
      {dlg?.kind === 'txn' && <TxnEntryDialog initialType={dlg.type} row={dlg.row} draft={dlg.draft} defaultMonth={ym} onClose={() => setDlg(null)} />}
      {splitFor && <SplitDialog expense={splitFor} onClose={() => setSplitFor(null)} />}
      <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog open={dlg?.kind === 'delmany'} onOpenChange={(o) => !o && setDlg(null)} title={`Delete ${dlg?.txs?.length ?? 0} transactions?`}
        description="Linked bank balances and card outstanding are restored for each one. This cannot be undone." confirmLabel="Delete all" variant="destructive"
        onConfirm={async () => {
          const items = dlg?.txs ?? []; let done = 0
          try { for (const t of items) { t.kind === 'expense' ? await deleteExpense(db, t.id) : t.kind === 'income' ? await deleteIncome(db, t.id) : await deleteTransfer(db, t.id); done++ } toast.success(`Deleted ${done}`) }
          catch (e) { toast.error(`${e instanceof Error ? e.message : 'Could not delete'}. ${done} deleted before it stopped.`) }
          setDlg(null)
        }} />
      <ConfirmDialog open={dlg?.kind === 'del'} onOpenChange={(o) => !o && setDlg(null)} title={`Delete this ${dlg?.tx?.kind ?? 'transaction'}?`}
        description={dlg?.tx?.kind === 'transfer' ? 'Both balances are restored.' : dlg?.tx?.kind === 'income' ? 'The account balance is reduced by this amount again.' : 'The linked bank balance or card outstanding is restored.'} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { const t = dlg!.tx!; try { t.kind === 'expense' ? await deleteExpense(db, t.id) : t.kind === 'income' ? await deleteIncome(db, t.id) : await deleteTransfer(db, t.id); toast.success('Deleted') } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not delete') } setDlg(null) }} />
    </div>
  )
}

function BudgetForm({ ym, row, onClose, onSave }: { ym: string; row?: any; onClose: () => void; onSave: (r: any) => Promise<void> }) {
  const { expense: EXPENSE_CATEGORIES } = useCategories()
  const [total, setTotal] = useState(String(row?.total ?? ''))
  const [cats, setCats] = useState<Record<string, string>>(Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, String(row?.categories?.[c] ?? '')])))
  const [rollover, setRollover] = useState(!!row?.rollover)
  const [periods, setPeriods] = useState<Record<string, string>>(row?.periods || {})
  const [ranges, setRanges] = useState<Record<string, { start: string; end: string }>>(row?.customRanges || {})
  const [rollCats, setRollCats] = useState<string[]>(row?.rolloverCats || [])
  const sum = EXPENSE_CATEGORIES.reduce((s, c) => s + (Number(cats[c]) || 0), 0)
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Budget for ${ym}`} wide
      onSubmit={async () => { const t = Number(total); if (!(t > 0)) throw new Error('Monthly budget must be positive'); await onSave({ id: ym, total: t, categories: Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, Number(cats[c]) || 0])), rollover, rolloverCats: rollCats.filter((c) => Number(cats[c]) > 0), periods: Object.fromEntries(Object.entries(periods).filter(([c, p]) => p !== 'monthly' && Number(cats[c]) > 0)), customRanges: Object.fromEntries(Object.entries(ranges).filter(([c, r]) => periods[c] === 'custom' && r.start && r.end && r.end >= r.start)) }) }}>
      <Field label="Monthly budget (₹)" className="full">{(id) => <Input id={id} type="number" min="1" step="any" required value={total} onChange={(e) => setTotal(e.target.value)} />}</Field>
      <div className="full">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span className="flex-1">Category limits</span>
          <InfoTip label="About budget periods">Choose how long each limit lasts. Monthly resets every month. Quarterly and Yearly are one limit for the whole quarter or year, and spending counts from its start. Custom is a date range of your own, such as a trip. Tick Roll over to carry what is unspent into next month (monthly limits).</InfoTip>
        </div>
        <ul className="space-y-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const per = periods[c] || 'monthly'
            const rng = ranges[c] || { start: '', end: '' }
            return (
              <li key={c} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold">{c}</span>
                  <div className="w-32 shrink-0"><Input aria-label={`${c} limit in rupees`} type="number" min="0" step="any" inputMode="decimal" placeholder="Limit" value={cats[c]} onChange={(e) => setCats((p) => ({ ...p, [c]: e.target.value }))} /></div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div role="radiogroup" aria-label={`${c} budget period`} className="inline-flex rounded-lg border border-border bg-muted p-0.5"
                    onKeyDown={(e) => { const order = ['monthly', 'quarterly', 'yearly', 'custom']; const i = order.indexOf(per); const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return; e.preventDefault(); const next = order[(i + d + order.length) % order.length]; setPeriods((p) => ({ ...p, [c]: next })); requestAnimationFrame(() => (e.currentTarget.querySelector(`[data-period="${next}"]`) as HTMLElement | null)?.focus()) }}>
                    {[['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['yearly', 'Yearly'], ['custom', 'Custom']].map(([v, l]) => (
                      <button key={v} type="button" role="radio" data-period={v} tabIndex={per === v ? 0 : -1} aria-checked={per === v} onClick={() => setPeriods((p) => ({ ...p, [c]: v }))} className={cn('rounded-md px-2.5 py-1 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring', per === v ? 'bg-primary text-primary-foreground shadow-card' : 'text-muted-foreground hover:text-foreground')}>{l}</button>
                    ))}
                  </div>
                  {per === 'monthly' && <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Checkbox checked={rollCats.includes(c)} disabled={!(Number(cats[c]) > 0)} onChange={(e) => setRollCats((p) => (e.target.checked ? [...p, c] : p.filter((x) => x !== c)))} aria-label={`Roll over unspent ${c} budget`} />Roll over</label>}
                </div>
                {per === 'custom' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">From<DateInput aria-label={`${c} starts`} value={rng.start} onChange={(e) => setRanges((p) => ({ ...p, [c]: { ...rng, start: e.target.value } }))} /></label>
                    <label className="text-xs text-muted-foreground">To<DateInput aria-label={`${c} ends`} value={rng.end} onChange={(e) => setRanges((p) => ({ ...p, [c]: { ...rng, end: e.target.value } }))} /></label>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">Limits add up to {formatINR(sum)}{Number(total) ? ` · ${formatINR(Number(total) - sum)} unallocated` : ''}</p>
      </div>
      <label className="full flex items-center gap-2 text-sm"><Checkbox checked={rollover} onChange={(e) => setRollover(e.target.checked)} />Roll over the unspent total budget<InfoTip label="About total rollover">Adds whatever was left of last month's total budget to this month's.</InfoTip></label>
    </FormDialog>
  )
}
