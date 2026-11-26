'use client'

import Link from 'next/link'
import { BackBar } from '@/components/shell/BackBar'
import { IncomeProgressPanel, type IncomePlan } from '@/components/wealth/budget/IncomeBudget'
import { planFor } from '@/lib/wealth/incomeBudget'
import { toastProblem } from '@/lib/notify'
import { TabBar } from '@/components/ui/tab-bar'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { useKeys } from '@/lib/hooks/useKeys'
import { RecurringView } from '@/components/wealth/budget/RecurringView'
import { SubscriptionsPanel } from '@/components/wealth/budget/Subscriptions'
import { ReviewView } from '@/components/wealth/budget/ReviewView'
import { CashFlowView } from '@/components/wealth/budget/CashFlowView'
import { BudgetList } from '@/components/wealth/budget/BudgetList'
import { expenseParts } from '@/lib/wealth/splits'
import { SplitDialog } from '@/components/wealth/budget/SplitDialog'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deleteExpense, deleteIncome, deleteTransfer, save, setBookmarks } from '@/lib/wealth/actions'
import { addMonths, budgetPacing, round2, toISO, istNow } from '@/lib/wealth/calc'
import { useCategories } from '@/lib/wealth/useCategories'
import { buildTransactions, inMonth } from '@/lib/wealth/transactions'
import { TxnEntryDialog, type TxnType } from '@/components/wealth/budget/TxnEntryDialog'
import { CalendarView, MonthlyView, StatsView, SummaryStrip, SummaryView, TransactionsView, type Tx } from '@/components/wealth/budget/Views'
import { MonthPicker } from '@/components/ui/pickers'
import { categoryTotals, monthTotal } from '@/lib/wealth/selectors'
import { formatINR } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { GrowwChart } from '@/components/wealth/GrowwChart'
import { Empty, LoadingBlock, PageHeader, Panel, Metric, Select, Stat, UsagePct } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { GROUPS, VIEW_LABEL, groupOf, viewFor, KEY_GROUPS } from '@/lib/wealth/budgetTabs'

const TAB_ORDER = ['overview', 'transactions', 'calendar', 'review', 'monthly', 'summary', 'stats', 'cashflow', 'recurring'] as const

export default function BudgetPage() {
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const today = useMemo(() => istNow(), [])
  const curYm = toISO(today).slice(0, 7)
  const [ym, setYm] = useState(curYm)
  const [dlg, setDlg] = useState<null | { kind: 'categories' | 'txn' | 'del' | 'delmany'; row?: any; draft?: any; type?: TxnType; tx?: Tx; txs?: Tx[] }>(null)
  const [tab, setTab] = useState<'overview' | 'transactions' | 'calendar' | 'monthly' | 'summary' | 'recurring' | 'stats' | 'cashflow' | 'review'>('overview')
  const { expense: EXPENSE_CATEGORIES } = useCategories()
  const [catFilter, setCatFilter] = useState('')
  const lastTabBeforeCategory = useRef<'overview'>('overview')
  const [txnKind, setTxnKind] = useState<'all' | 'expense' | 'income' | 'transfer'>('all') // which kind the Transactions list opens on, when you came from a summary card
  const [txnCat, setTxnCat] = useState('') // category the Transactions list opens on, when you came from a category
  const [pacingOpen, setPacingOpen] = useState(false) // the pace chart and detail numbers are one tap away, not on the page by default
  const router = useRouter()
  const params = useSearchParams()
  const fromCategory = useRef(false)
  // a category opens that month's expense list as its own history step, so Back goes to the Overview or Budgets you came from
  const openCategory = (c: string) => { fromCategory.current = true; lastTabBeforeCategory.current = 'overview'; router.push(`/dashboard/budget?tab=transactions&cat=${encodeURIComponent(c)}`) }
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
    '1': () => openGroup(KEY_GROUPS[1]), '2': () => openGroup(KEY_GROUPS[2]), '3': () => openGroup(KEY_GROUPS[3]), '4': () => openGroup(KEY_GROUPS[4]),
    '[': () => setYm((cur) => addMonths(`${cur}-01`, -1).slice(0, 7)),
    ']': () => setYm((cur) => { const next = addMonths(`${cur}-01`, 1).slice(0, 7); return next > curYm ? cur : next }),
  })
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

  const sectionBar = (
    <TabBar label="Spend sections" value={groupOf(tab)}
      onChange={(k) => openGroup(k)}
      tabs={[...GROUPS.map((g) => ({ key: g.key, label: g.label, badge: g.key === 'transactions' ? reviewCount : undefined }))]} />
  )
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

      {sectionBar}
      {(() => {
        const views = GROUPS.find((g) => g.key === groupOf(tab))!.views
        if (views.length < 2) return null
        return (
          <div role="group" aria-label="Views in this section" className="-mt-2 flex flex-wrap gap-1.5">
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
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) { const i = TAB_ORDER.indexOf(tab); const n = TAB_ORDER[i + (dx < 0 ? 1 : -1)]; if (n) setTab(n) }
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
      {spTab === 'transactions' && (spCat || spKind) && <BackBar />}
      {/* income, expenses and the rest of the month at a glance, first */}
      {tab === 'overview' && <SummaryStrip list={monthTx} onOpen={openKind} />}
      {tab === 'overview' && (!budget || !p ? (
        <Empty title={`No budget for ${monthName}`} description="Set a monthly budget in Settings to see daily pacing and projections." action={<Button asChild><Link href="/dashboard/settings?tab=budget">Set budget in Settings</Link></Button>} />
      ) : (
        <>
          <BudgetList budget={budget ? { ...budget, total: effective } : budget} prevBudget={prevBudget} expenses={data.expenses} ym={ym} today={today} onOpenCategory={openCategory} />
          <IncomeProgressPanel plan={incomePlan} bankTxns={data.bankTxns} ym={ym} />
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
              <GrowwChart height={256} tone="neutral" secondLabel="Expected" ariaLabel="Spending so far this month against the expected pace"
                data={p.series.map((x: any) => ({ x: `Day ${x.day}`, y: x.actual, y2: x.expected }))} format={(v) => (privacyMode ? '••••' : formatINR(v))} />
              <p className="mt-2 text-xs text-muted-foreground">Solid line: spent so far. Dashed line: the even pace to the month end{scopeBudget > 0 ? `, where it reaches the ${formatINR(scopeBudget)} budget` : ''}.</p>
            </Panel>

            </>
          )}
        </>
      ))}



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
