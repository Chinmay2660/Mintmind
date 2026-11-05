'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Settings2, Tags, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deleteExpense, deleteIncome, deleteTransfer, save } from '@/lib/wealth/actions'
import { addMonths, availableBalance, budgetPacing, round2, toISO } from '@/lib/wealth/calc'
import { useCategories } from '@/lib/wealth/useCategories'
import { buildTransactions, inMonth } from '@/lib/wealth/transactions'
import { TxnEntryDialog, type TxnType } from '@/components/wealth/budget/TxnEntryDialog'
import { CalendarView, CategoryManager, StatsView, SummaryStrip, TransactionsView, type Tx } from '@/components/wealth/budget/Views'
import { categoryTotals, monthKey, monthTotal } from '@/lib/wealth/selectors'
import { formatCompactINR, formatDate, formatINR } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Progress, Select, Stat, chartAxis, chartColor, chartGrid, chartTooltipStyle, toneForPct } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { SmartBudget } from '@/components/ai/SmartBudget'
import { usePrivacyMode } from '@/contexts/PrivacyContext'

export default function BudgetPage() {
  const { ready, data, db } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const today = useMemo(() => new Date(), [])
  const curYm = toISO(today).slice(0, 7)
  const [ym, setYm] = useState(curYm)
  const [dlg, setDlg] = useState<null | { kind: 'budget' | 'categories' | 'txn' | 'del'; row?: any; type?: TxnType; tx?: Tx }>(null)
  const [tab, setTab] = useState<'overview' | 'transactions' | 'calendar' | 'stats'>('overview')
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
      if (prev) save(db, 'budgets', { id: curYm, total: prev.total, categories: prev.categories, rollover: prev.rollover })
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
  const scopeExpenses = useMemo(() => (catFilter ? data.expenses.filter((e) => e.category === catFilter) : data.expenses), [data.expenses, catFilter])
  const p = useMemo(() => (budget ? budgetPacing({ budget: scopeBudget, expenses: scopeExpenses, year, month, today }) : null), [budget, scopeBudget, scopeExpenses, year, month, today])
  const cats = useMemo(() => categoryTotals(data.expenses, ym), [data.expenses, ym])
  const prevTotal = monthTotal(scopeExpenses, prevYm)
  const allTx = useMemo(() => buildTransactions({ expenses: data.expenses, bankTxns: data.bankTxns, transfers: data.transfers, bankAccounts: data.bankAccounts, cards: data.cards }) as unknown as Tx[], [data.expenses, data.bankTxns, data.transfers, data.bankAccounts, data.cards])
  const monthTx = useMemo(() => inMonth(allTx as any, ym) as unknown as Tx[], [allTx, ym])
  const edit = (t: Tx) => setDlg({ kind: 'txn', row: t.raw })
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
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setYm(prevYm)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-32 text-center text-sm font-medium">{monthName}</span>
              <Button variant="outline" size="icon" aria-label="Next month" disabled={ym >= curYm} onClick={() => setYm(addMonths(`${ym}-01`, 1).slice(0, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" onClick={() => setDlg({ kind: 'categories' })}><Tags className="mr-1.5 h-4 w-4" />Categories</Button>
            <Button variant="outline" onClick={() => setDlg({ kind: 'budget' })}><Settings2 className="mr-1.5 h-4 w-4" />Budget</Button>
            <Button onClick={() => setDlg({ kind: 'txn', type: 'expense' })}><Plus className="mr-1.5 h-4 w-4" />Add transaction</Button>
          </>
        }
      />

      {alerts.length > 0 && (
        <div role="status" className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          {alerts.map((a) => <p key={a} className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{a}</p>)}
        </div>
      )}

      <div role="tablist" aria-label="Budget views" className="flex gap-1 overflow-x-auto border-b border-border">
        {([['overview', 'Overview'], ['transactions', 'Transactions'], ['calendar', 'Calendar'], ['stats', 'Stats']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('shrink-0 border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:bg-muted', tab === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{l}</button>
        ))}
      </div>

      {tab === 'transactions' && <TransactionsView list={monthTx} ym={ym} onEdit={edit} onDelete={askDelete} onAdd={() => setDlg({ kind: 'txn', type: 'expense' })} />}
      {tab === 'calendar' && <CalendarView list={monthTx} ym={ym} onEdit={edit} onDelete={askDelete} />}
      {tab === 'stats' && <StatsView list={monthTx} />}

      {tab === 'overview' && (!budget || !p ? (
        <Empty title={`No budget for ${monthName}`} description="Set a monthly budget to see daily pacing and projections." action={<Button onClick={() => setDlg({ kind: 'budget' })}>Set budget</Button>} />
      ) : (
        <>
          <SmartBudget />
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="budget-scope" className="text-sm font-medium">Showing</label>
            <Select id="budget-scope" className="w-auto" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {catFilter && catLimit === 0 && <span className="text-xs text-warning">No limit set for {catFilter}. Set one under Budget to see its daily pace.</span>}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={catFilter ? `${catFilter} budget` : 'Monthly budget'} value={<Money value={scopeBudget} />} hint={!catFilter && carry > 0 ? `incl. ${formatINR(carry)} rolled over` : `${p.days} days`} />
            <Stat label="Spent" value={<Money value={p.spent} />} hint={`${p.utilisation}% used`} />
            <Stat label="Remaining" value={<span className={p.remaining < 0 ? 'text-destructive' : ''}><Money value={p.remaining} /></span>} hint={p.remainingDays > 0 ? `${formatINR(p.safeDailySpend)}/day safe to spend` : undefined} />
            <Stat label={catFilter ? `${catFilter} daily budget` : 'Daily budget'} value={<Money value={p.dailyBudget} decimals />} hint={catFilter ? 'category limit ÷ days in month' : 'budget ÷ days in month'} />
            <Stat label={`Expected by ${ym === curYm ? 'today' : 'month end'}`} value={<Money value={p.expectedTillToday} />} hint="Pace line, not remaining" />
            <Stat label={p.variance > 0 ? 'Over pace by' : 'Under pace by'} value={<span className={p.variance > 0 ? 'text-destructive' : 'text-success'}><Money value={Math.abs(p.variance)} /></span>} />
            <Stat label="Projected month-end" value={<Money value={p.projected} />} hint={p.projectedOver > 0 ? `${formatINR(p.projectedOver)} over` : 'within budget'} />
            <Stat label="Change vs last month" value={<Money value={p.spent - prevTotal} signed={false} />} hint={`Last month ${formatINR(prevTotal)}`} />
          </div>

          <Panel title={catFilter ? `Daily pacing: ${catFilter}` : 'Daily pacing'} description="Expected cumulative spend (budget ÷ days × day) against actual cumulative spend">
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

          <Panel title="Category budgets" description="Each category has its own daily budget (limit ÷ days in the month). Select one to see its pace.">
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
      {dlg?.kind === 'txn' && <TxnEntryDialog initialType={dlg.type} row={dlg.row} defaultMonth={ym} onClose={() => setDlg(null)} />}
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
  const sum = EXPENSE_CATEGORIES.reduce((s, c) => s + (Number(cats[c]) || 0), 0)
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Budget for ${ym}`} wide description="Category limits are optional. They do not need to add up exactly to the monthly total."
      onSubmit={async () => { const t = Number(total); if (!(t > 0)) throw new Error('Monthly budget must be positive'); await onSave({ id: ym, total: t, categories: Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, Number(cats[c]) || 0])), rollover }) }}>
      <Field label="Monthly budget (₹)" className="full">{(id) => <Input id={id} type="number" min="1" step="any" required value={total} onChange={(e) => setTotal(e.target.value)} />}</Field>
      {EXPENSE_CATEGORIES.map((c) => <Field key={c} label={c}>{(id) => <Input id={id} type="number" min="0" step="any" value={cats[c]} onChange={(e) => setCats((p) => ({ ...p, [c]: e.target.value }))} />}</Field>)}
      <p className="full text-xs text-muted-foreground">Category limits total {formatINR(sum)}{Number(total) ? ` (${formatINR(Number(total) - sum)} unallocated)` : ''}.</p>
      <label className="full flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={rollover} onChange={(e) => setRollover(e.target.checked)} />Roll over unspent budget from the previous month</label>
    </FormDialog>
  )
}
