'use client'

import { BudgetEditor, type EditorGroup } from '@/components/wealth/budget/BudgetEditor'
import { IncomeBudgetForm, IncomeProgressPanel, type IncomePlan } from '@/components/wealth/budget/IncomeBudget'
import { planFor } from '@/lib/wealth/incomeBudget'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { toastProblem } from '@/lib/notify'
import { TabBar } from '@/components/ui/tab-bar'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Plus, Settings2, TriangleAlert } from 'lucide-react'
import { useKeys } from '@/lib/hooks/useKeys'
import { RecurringView } from '@/components/wealth/budget/RecurringView'
import { SubscriptionsPanel } from '@/components/wealth/budget/Subscriptions'
import { ReviewView } from '@/components/wealth/budget/ReviewView'
import { CashFlowView } from '@/components/wealth/budget/CashFlowView'
import { BudgetList } from '@/components/wealth/budget/BudgetList'
import { expenseParts } from '@/lib/wealth/splits'
import { SplitDialog } from '@/components/wealth/budget/SplitDialog'
import { toast } from 'sonner'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deleteExpense, deleteIncome, deleteTransfer, save, setBookmarks } from '@/lib/wealth/actions'
import { addMonths, availableBalance, budgetPacing, round2, toISO } from '@/lib/wealth/calc'
import { useCategories } from '@/lib/wealth/useCategories'
import { childOf, groupCategories } from '@/lib/wealth/subcategories'
import { buildTransactions, inMonth } from '@/lib/wealth/transactions'
import { TxnEntryDialog, type TxnType } from '@/components/wealth/budget/TxnEntryDialog'
import { CalendarView, MonthlyView, StatsView, SummaryStrip, SummaryView, TransactionsView, type Tx } from '@/components/wealth/budget/Views'
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
import { GROUPS, VIEW_LABEL, groupOf, viewFor, KEY_GROUPS } from '@/lib/wealth/budgetTabs'
import { Checkbox } from '@/components/ui/checkbox'

const TAB_ORDER = ['overview', 'budgets', 'transactions', 'calendar', 'review', 'monthly', 'summary', 'stats', 'cashflow', 'recurring'] as const

export default function BudgetPage() {
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const today = useMemo(() => new Date(), [])
  const curYm = toISO(today).slice(0, 7)
  const [ym, setYm] = useState(curYm)
  const [dlg, setDlg] = useState<null | { kind: 'budget' | 'incomeBudget' | 'categories' | 'txn' | 'del' | 'delmany'; row?: any; draft?: any; type?: TxnType; tx?: Tx; txs?: Tx[] }>(null)
  const [tab, setTab] = useState<'overview' | 'budgets' | 'transactions' | 'calendar' | 'monthly' | 'summary' | 'recurring' | 'stats' | 'cashflow' | 'review'>('overview')
  const { expense: EXPENSE_CATEGORIES, income: INCOME_CATEGORIES } = useCategories()
  const [catFilter, setCatFilter] = useState('')
  const [budgetKind, setBudgetKind] = useState<'expense' | 'income'>('expense') // which budget the Budgets tab is setting
  const lastTabBeforeCategory = useRef<'overview' | 'budgets'>('overview')
  const [txnKind, setTxnKind] = useState<'all' | 'expense' | 'income' | 'transfer'>('all') // which kind the Transactions list opens on, when you came from a summary card
  const [txnCat, setTxnCat] = useState('') // category the Transactions list opens on, when you came from a category
  const [pacingOpen, setPacingOpen] = useState(false) // the pace chart and detail numbers are one tap away, not on the page by default
  const [openKids, setOpenKids] = useState<Set<string>>(new Set()) // parents whose sub-categories are showing in Category budgets
  const router = useRouter()
  const [phone, setPhone] = useState(false)
  useEffect(() => { const mq = window.matchMedia('(max-width: 767px)'); const f = () => setPhone(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [])
  const params = useSearchParams()
  const fromCategory = useRef(false)
  // a category opens that month's expense list as its own history step, so Back goes to the Overview or Budgets you came from
  const openCategory = (c: string) => { fromCategory.current = true; lastTabBeforeCategory.current = tab === 'budgets' ? 'budgets' : 'overview'; router.push(`/dashboard/budget?tab=transactions&cat=${encodeURIComponent(c)}`) }
  const openKind = (k: 'income' | 'expense' | 'all') => { fromCategory.current = true; lastTabBeforeCategory.current = 'overview'; router.push(`/dashboard/budget?tab=transactions&kind=${k}`) }
  const spTab = params.get('tab'), spCat = params.get('cat'), spKind = params.get('kind')
  useEffect(() => {
    if (spTab === 'transactions') { setTxnCat(spCat || ''); setTxnKind(spKind === 'income' || spKind === 'expense' || spKind === 'transfer' ? spKind : 'all'); setTab('transactions') }
    else if (fromCategory.current) { fromCategory.current = false; setTxnCat(''); setTxnKind('all'); setTab(lastTabBeforeCategory.current) }
  }, [spTab, spCat, spKind])

  const budget = data.budgets.find((b) => b.id === ym)
  const incomePlans = (data.meta.find((m: any) => m.key === 'incomeBudgets')?.value ?? {}) as Record<string, IncomePlan>
  const incomePlan = planFor(incomePlans, ym)
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
  const [moreStats, setMoreStats] = useState(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const lastView = useRef<Record<string, string>>({})
  const openGroup = (g: string) => setTab(viewFor(g, lastView.current) as typeof tab)
  useEffect(() => { lastView.current[groupOf(tab)] = tab }, [tab])
  useKeys({
    '1': () => openGroup(KEY_GROUPS[1]), '2': () => openGroup(KEY_GROUPS[2]), '3': () => openGroup(KEY_GROUPS[3]), '4': () => openGroup(KEY_GROUPS[4]), '5': () => openGroup(KEY_GROUPS[5]),
    '[': () => setYm((cur) => addMonths(`${cur}-01`, -1).slice(0, 7)),
    ']': () => setYm((cur) => { const next = addMonths(`${cur}-01`, 1).slice(0, 7); return next > curYm ? cur : next }),
  })
  const step = (by: number) => setYm((cur) => { const next = addMonths(`${cur}-01`, by).slice(0, 7); return next > curYm ? cur : next })
  // on a phone the Overview is the home: the other views open from its list as pages of their own, and Back returns to it
  // (a category's expense list is its own history step already, so Back just goes back)
  const cameFromCategory = spTab === 'transactions'
  const backToOverview = () => { if (cameFromCategory) router.back(); else setTab('overview') }
  useDetailCrumb(phone && tab !== 'overview' && !cameFromCategory ? (VIEW_LABEL as Record<string, string>)[tab] : null, backToOverview)
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
          <div className="flex w-full items-center justify-center gap-1 max-md:!basis-full sm:w-auto sm:justify-start">
            <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setYm(prevYm)}><ChevronLeft className="h-4 w-4" /></Button>
            <MonthPicker value={ym} max={curYm} onChange={setYm} className="min-w-32 justify-center" />
            <Button variant="outline" size="icon" aria-label="Next month" disabled={ym >= curYm} onClick={() => setYm(addMonths(`${ym}-01`, 1).slice(0, 7))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
        primaryAction={{ label: 'Add transaction', onClick: () => setDlg({ kind: 'txn', type: 'expense' }) }}
      />

      {tab === 'overview' && alerts.length > 0 && (
        <div role="status" className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          {alerts.slice(0, 2).map((a) => <p key={a} className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{a}</p>)}
          {alerts.length > 2 && <p className="pl-6 text-xs text-muted-foreground">and {alerts.length - 2} more categories over their limit. See the list below.</p>}
        </div>
      )}

      {tab !== 'overview' && (
        <div className="flex items-center gap-2 md:hidden">
          <button type="button" onClick={backToOverview} className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" aria-hidden />Budget</button>
          <span className="text-sm font-semibold">{(VIEW_LABEL as Record<string, string>)[tab]}</span>
        </div>
      )}
      <div className="max-md:hidden"><TabBar label="Budget sections" tabs={GROUPS.map((g) => ({ key: g.key, label: g.label, badge: g.key === 'transactions' ? reviewCount : undefined }))} value={groupOf(tab)} onChange={openGroup} /></div>
      {(() => {
        const views = GROUPS.find((g) => g.key === groupOf(tab))!.views
        if (views.length < 2) return null
        return (
          <div role="group" aria-label="Views in this section" className="-mt-2 flex flex-wrap gap-1.5 max-md:hidden">
            {views.map((v) => (
              <button key={v} type="button" aria-pressed={tab === v} onClick={() => setTab(v as typeof tab)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === v ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {VIEW_LABEL[v]}{v === 'review' && reviewCount ? <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">{reviewCount}</span> : null}
              </button>
            ))}
          </div>
        )
      })()}

      {/* Swipe sideways to move between tabs. Months have their arrows and the [ ] keys. Scrollers, sliders, fields and swipeable rows keep their own gestures. */}
      <div className="space-y-5"
        onTouchStart={(e) => { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY } }}
        onTouchEnd={(e) => {
          const st = swipe.current; swipe.current = null
          if (!st) return
          if (st.x <= 24) return // the left edge belongs to swipe-back
          if ((e.target as HTMLElement).closest('[role="region"], [role="tablist"], [role="slider"], [data-swipe-row], input, textarea, [role="dialog"]')) return
          const t = e.changedTouches[0]; const dx = t.clientX - st.x; const dy = t.clientY - st.y
          if (!phone && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) { const i = TAB_ORDER.indexOf(tab); const n = TAB_ORDER[i + (dx < 0 ? 1 : -1)]; if (n) setTab(n) }
        }}>
      {tab === 'transactions' && <TransactionsView key={`${txnCat}|${txnKind}`} initialCategory={txnCat} initialKind={txnKind} list={monthTx} ym={ym} onEdit={edit} onDelete={askDelete} onDuplicate={duplicate} onSplit={(t) => setSplitFor(t.raw)} onBookmark={bookmark} onBulkDelete={(txs) => setDlg({ kind: 'delmany', txs })} onAdd={() => setDlg({ kind: 'txn', type: 'expense' })} />}
      {tab === 'calendar' && <CalendarView list={monthTx} ym={ym} onEdit={edit} onDelete={askDelete} onDuplicate={duplicate} onBookmark={bookmark} />}
      {tab === 'monthly' && <MonthlyView all={allTx} ym={ym} curYm={curYm} onPick={(k) => { setYm(k); setTab('transactions') }} />}
      {tab === 'summary' && <SummaryView list={monthTx} ym={ym} />}
      {tab === 'recurring' && <div className="space-y-5"><SubscriptionsPanel /><RecurringView expenses={data.expenses} /></div>}
      {tab === 'stats' && <StatsView list={monthTx} />}
      </div>

      {tab === 'review' && <ReviewView list={allTx} onEdit={edit} />}
      {tab === 'cashflow' && <CashFlowView list={allTx as any[]} ym={ym} />}
      {tab === 'budgets' && (
        <div className="space-y-4">
          <div role="tablist" aria-label="Which budget" className="grid grid-cols-2 rounded-xl border border-border bg-muted p-1">
            {([['expense', 'Expense'], ['income', 'Income']] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={budgetKind === k} onClick={() => setBudgetKind(k)} className={cn('min-h-10 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', budgetKind === k ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>{l}</button>
            ))}
          </div>
          <p className="px-1 text-xs text-muted-foreground">Setting the budget for <strong className="font-semibold text-foreground">{monthName}</strong>. Change the month at the top. How you are doing against it is on the Overview.</p>
          {budgetKind === 'expense' ? (
            <BudgetEditor
              key={`expense|${ym}|${budget?.total ?? 0}|${JSON.stringify(budget?.categories ?? {})}`}
              groups={groupCategories(EXPENSE_CATEGORIES) as EditorGroup[]}
              values={(budget?.categories ?? {}) as Record<string, number>}
              total={budget?.total ?? 0}
              totalLabel="Monthly budget"
              copyFrom={prevBudget ? { total: prevBudget.total, values: (prevBudget.categories ?? {}) as Record<string, number> } : null}
              copyLabel="Copy last month"
              onMore={budget ? () => setDlg({ kind: 'budget' }) : undefined}
              onSave={async (t, map) => {
                const sum = Object.values(map).reduce((x, y) => x + y, 0)
                const total = t > 0 ? t : sum
                if (!(total > 0)) { toast.warning('Enter a monthly budget, or a limit for at least one category'); return }
                const base = budget ?? { rollover: false, rolloverCats: [], periods: {} }
                await save(db, 'budgets', { ...base, id: ym, total, categories: map })
                toast.success('Budget saved')
              }}
            />
          ) : (
            <BudgetEditor
              key={`income|${ym}|${incomePlan?.total ?? 0}|${JSON.stringify(incomePlan?.categories ?? {})}`}
              groups={INCOME_CATEGORIES.map((c) => ({ name: c, children: [] }))}
              values={incomePlan?.categories ?? {}}
              total={incomePlan?.total ?? 0}
              totalLabel="Expected income"
              copyFrom={(() => { const prev = planFor(incomePlans, prevYm); return prev && prev !== incomePlan ? { total: prev.total, values: prev.categories ?? {} } : null })()}
              copyLabel="Copy last month"
              onSave={async (t, map) => {
                const sum = Object.values(map).reduce((x, y) => x + y, 0)
                const total = t > 0 ? t : sum
                if (!(total > 0)) { toast.warning('Enter the income you expect, or an amount for at least one category'); return }
                await db.meta.put({ key: 'incomeBudgets', value: { ...incomePlans, [ym]: { total, categories: map } } })
                toast.success('Income budget saved')
              }}
            />
          )}
        </div>
      )}
      {/* income, expenses and the rest of the month at a glance, first */}
      {tab === 'overview' && <SummaryStrip list={monthTx} onOpen={openKind} />}
      {tab === 'overview' && (!budget || !p ? (
        <Empty title={`No budget for ${monthName}`} description="Set a monthly budget to see daily pacing and projections." action={<Button onClick={() => setDlg({ kind: 'budget' })}>Set budget</Button>} />
      ) : (
        <>
          <BudgetList budget={budget ? { ...budget, total: effective } : budget} prevBudget={prevBudget} expenses={data.expenses} ym={ym} today={today} onEdit={() => setDlg({ kind: 'budget' })} onOpenCategory={openCategory} />
          <IncomeProgressPanel plan={incomePlan} bankTxns={data.bankTxns} ym={ym} onEdit={() => setDlg({ kind: 'incomeBudget' })} />
          <button type="button" onClick={() => setPacingOpen((v) => !v)} aria-expanded={pacingOpen} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border px-4 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><span>Daily pace and numbers</span><ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', pacingOpen && 'rotate-180')} aria-hidden /></button>
          {pacingOpen && (
            <>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="budget-scope" className="text-sm font-medium">Showing</label>
              <Select id="budget-scope" className="w-auto" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">All categories</option>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              {catFilter && catLimit === 0 && <span className="text-xs text-warning">No limit set for {catFilter}. Set one under Budget to see its daily pace.</span>}
            </div>
            <div className={cn('grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 border-b border-border pb-5 max-md:[&>*]:px-3 max-md:[&>*]:py-3', !moreStats && 'max-md:hidden')}>
              <Stat label={catFilter ? `${catFilter} budget` : 'Monthly budget'} value={<Money value={scopeBudget} />} hint={!catFilter && carry > 0 ? `incl. ${formatINR(carry)} rolled over` : `${p.days} days`} />
              <Stat label="Spent" value={<Money value={p.spent} />} hint={<span className="flex flex-wrap items-center gap-x-2"><span><UsagePct value={p.utilisation} warnAt={70} highAt={90} /> used</span><Metric amount={p.spent - prevTotal} invertGood className="text-xs" hint="No spending last month" /></span>} />
              <Stat label="Remaining" value={<span className={p.remaining < 0 ? 'text-destructive' : ''}><Money value={p.remaining} /></span>} hint={p.remainingDays > 0 ? `${formatINR(p.safeDailySpend)}/day safe to spend` : undefined} />
              <Stat label={catFilter ? `${catFilter} daily budget` : 'Daily budget'} value={<Money value={p.dailyBudget} decimals />} hint={catFilter ? 'category limit ÷ days in month' : 'budget ÷ days in month'} />
              <Stat label={`Expected by ${ym === curYm ? 'today' : 'month end'}`} value={<Money value={p.expectedTillToday} />} hint="Pace line, not remaining" />
              <Stat label={p.variance > 0 ? 'Over pace by' : 'Under pace by'} value={<span className={p.variance > 0 ? 'text-destructive' : 'text-success'}><Money value={Math.abs(p.variance)} /></span>} />
              <Stat label="Projected month-end" value={<Money value={p.projected} />} hint={p.projectedOver > 0 ? `${formatINR(p.projectedOver)} over` : 'within budget'} />
              <Stat label="Change vs last month" value={<Metric amount={p.spent - prevTotal} pct={prevTotal > 0 ? ((p.spent - prevTotal) / prevTotal) * 100 : null} invertGood className="text-lg font-semibold sm:text-xl" />} hint={`Last month ${formatINR(prevTotal)}`} />
            </div>
            <button type="button" onClick={() => setMoreStats((v) => !v)} aria-expanded={moreStats} className="-mt-2 flex w-full items-center justify-center gap-1 py-1 text-xs font-medium text-primary md:hidden">{moreStats ? 'Fewer numbers' : 'More numbers'}<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', moreStats && 'rotate-180')} /></button>

            <Panel title={catFilter ? `Daily pacing: ${catFilter}` : 'Daily pacing'}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={p.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="day" {...chartAxis} label={{ value: 'Day of month', position: 'insideBottom', offset: 0, fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} height={44} />
                    <YAxis {...chartAxis} width={52} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                    <Tooltip {...chartTooltipStyle} labelFormatter={(d) => `Day ${d}`} formatter={(v: number, n: string) => [privacyMode ? '••••' : formatINR(v), n]} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {scopeBudget > 0 && <ReferenceLine y={scopeBudget} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Budget', fill: 'hsl(var(--muted-foreground))', fontSize: 11, position: 'insideTopLeft' }} />}
                    {ym === curYm && <ReferenceLine x={p.dayToday} stroke="hsl(var(--border))" />}
                    <Line type="monotone" dataKey="expected" name="Expected cumulative" stroke={chartColor(2)} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                    <Line type="monotone" dataKey="actual" name="Actual cumulative" stroke={chartColor(3)} strokeWidth={2.5} dot={false} connectNulls={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            </>
          )}
        </>
      ))}


      {tab === 'overview' && (
        <div className="space-y-5 md:hidden">
          {([
            ['Spending', [['transactions', 'Transactions'], ['calendar', 'Calendar'], ['review', 'Review']]],
            ['Insights', [['monthly', 'Month by month'], ['summary', 'Summary'], ['stats', 'Stats'], ['cashflow', 'Cash flow']]],
            ['Plan', [['budgets', 'Set budgets'], ['recurring', 'Recurring payments']]],
          ] as const).map(([label, items]) => (
            <section key={label}>
              <h2 className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
              <ul className="surface-card divide-y divide-border px-4">
                {items.map(([v, name]) => (
                  <li key={v}><button type="button" onClick={() => setTab(v as typeof tab)} className="group flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>{name}</span><span className="flex items-center gap-2">{v === 'review' && reviewCount > 0 && <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">{reviewCount}</span>}<ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" aria-hidden /></span></button></li>
                ))}
              </ul>
            </section>))}
        </div>
      )}

      {dlg?.kind === 'budget' && <BudgetForm ym={ym} row={budget} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'budgets', r); toast.success('Budget saved') }} />}
      {dlg?.kind === 'incomeBudget' && <IncomeBudgetForm ym={ym} plan={incomePlan} onClose={() => setDlg(null)} onSave={async (pl) => { await db.meta.put({ key: 'incomeBudgets', value: { ...incomePlans, [ym]: pl } }); toast.success('Income budget saved') }} />}
      {dlg?.kind === 'txn' && <TxnEntryDialog initialType={dlg.type} row={dlg.row} draft={dlg.draft} defaultMonth={ym} onClose={() => setDlg(null)} />}
      {splitFor && <SplitDialog expense={splitFor} onClose={() => setSplitFor(null)} />}
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
        onConfirm={async () => { const t = dlg!.tx!; try { t.kind === 'expense' ? await deleteExpense(db, t.id) : t.kind === 'income' ? await deleteIncome(db, t.id) : await deleteTransfer(db, t.id); toast.success('Deleted') } catch (e) { toastProblem(e, 'Could not delete') } setDlg(null) }} />
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
