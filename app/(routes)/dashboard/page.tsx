'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWealth } from '@/lib/wealth/WealthContext'
import { budgetPacing, growthVs, healthScore, portfolioSummary, rangeStart, cardUtilisation } from '@/lib/wealth/calc'
import { ASSET_LABELS, LIABILITY_LABELS } from '@/lib/wealth/labels'
import { coverageTotals, incomeVsExpenses, monthLabel } from '@/lib/wealth/selectors'
import { upcomingCardDues, upcomingPremiums, upcomingSips } from '@/lib/wealth/reminders'
import { formatCompactINR, formatDate, formatINR, formatPct } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { CHART_PALETTE, Delta, Empty, LoadingBlock, Panel, Progress, RangeTabs, chartAxis, chartColor, chartGrid, chartTooltipStyle, toneForPct } from '@/components/wealth/kit'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { WealthAiWidget } from '@/components/ai/WealthAiWidget'
import { InsightsList } from '@/components/ai/InsightsList'
import { useAi } from '@/components/ai/useAi'

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'] as const
type Range = (typeof RANGES)[number]

function Widget({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="surface-card block p-4 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </Link>
  )
}

export default function DashboardPage() {
  const { ready, data, netWorth, isDemo } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const ai = useAi()
  const [range, setRange] = useState<Range>('1Y')
  const today = useMemo(() => new Date(), [])

  const m = useMemo(() => {
    if (!ready) return null
    const ym = today.toISOString().slice(0, 7)
    const nwNow = netWorth.netWorth
    const monthGrowth = growthVs(data.snapshots, nwNow, 1, today)
    const yearGrowth = growthVs(data.snapshots, nwNow, 12, today)
    const start = rangeStart(range, today)
    const series = [...data.snapshots].filter((s) => s.date >= start).sort((a, b) => a.date.localeCompare(b.date)).map((s) => ({ date: s.date, label: monthLabel(s.date.slice(0, 7)), netWorth: s.netWorth }))
    const budget = data.budgets.find((b) => b.id === ym)
    const pacing = budget ? budgetPacing({ budget: budget.total, expenses: data.expenses, year: today.getFullYear(), month: today.getMonth() + 1, today }) : null
    const portfolio = portfolioSummary(data.funds, data.fundTxns, data.sips, today)
    const cover = coverageTotals(data.policies, today)
    const limit = data.cards.reduce((s, c) => s + c.limit, 0)
    const outstanding = data.cards.reduce((s, c) => s + c.outstanding, 0)
    const util = cardUtilisation(limit, outstanding)
    const bankTotal = data.bankAccounts.reduce((s, b) => s + b.currentBalance, 0)
    const profile = data.meta.find((x) => x.key === 'profile')?.value
    const monthly = pacing?.spent ?? 0
    const health = healthScore({
      assets: netWorth.assets, liabilities: netWorth.liabilities,
      monthlyExpense: budget?.total || monthly, liquid: bankTotal, utilisation: util,
      insuranceCover: cover.byType.term || 0, annualIncome: (profile?.monthlyIncome || 0) * 12,
    })
    const dues = [
      ...upcomingCardDues(data.cards, today),
      ...upcomingPremiums(data.policies, today),
      ...upcomingSips(data.sips, data.funds, today),
    ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)
    const assetPie = Object.entries(netWorth.assetBreakdown).filter(([, v]) => v > 0).map(([k, v]) => ({ key: k, name: ASSET_LABELS[k as keyof typeof ASSET_LABELS] ?? k, value: v }))
    const liabPie = Object.entries(netWorth.liabilityBreakdown).filter(([, v]) => v > 0).map(([k, v]) => ({ key: k, name: LIABILITY_LABELS[k as keyof typeof LIABILITY_LABELS] ?? k, value: v }))
    const recent = [
      ...data.expenses.map((e) => ({ id: e.id, date: e.date, title: e.note || e.category, sub: e.category, amount: -e.amount })),
      ...data.bankTxns.filter((t) => t.type === 'income').map((t) => ({ id: t.id, date: t.date, title: t.description, sub: 'Income', amount: t.amount })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
    return { monthGrowth, yearGrowth, series, pacing, budget, portfolio, cover, limit, outstanding, util, bankTotal, health, dues, assetPie, liabPie, recent, cashflow: incomeVsExpenses(data.bankTxns, data.expenses, 6, today), prevMonthNW: monthGrowth?.base }
  }, [ready, data.snapshots, data.budgets, data.expenses, data.funds, data.fundTxns, data.sips, data.policies, data.cards, data.bankAccounts, data.bankTxns, data.meta, netWorth, range, today])

  if (!ready || !m) {
    return (
      <div className="space-y-4">
        <LoadingBlock className="h-40" />
        <div className="grid gap-4 md:grid-cols-2"><LoadingBlock className="h-72" /><LoadingBlock className="h-72" /></div>
      </div>
    )
  }

  const hasData = netWorth.assets > 0 || netWorth.liabilities > 0

  return (
    <div className="space-y-5">
      <section className="surface-card p-5 md:p-6" aria-label="Net worth summary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Net worth</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl"><Money value={netWorth.netWorth} /></p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              {m.monthGrowth && <span className="inline-flex items-center gap-1.5"><Delta amount={m.monthGrowth.diff} pct={m.monthGrowth.pct} /><span className="text-xs text-muted-foreground">this month</span></span>}
              {m.yearGrowth && <span className="inline-flex items-center gap-1.5"><Delta amount={m.yearGrowth.diff} pct={m.yearGrowth.pct} /><span className="text-xs text-muted-foreground">this year</span></span>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 text-sm">
            <div><dt className="text-xs text-muted-foreground">Assets</dt><dd className="font-semibold"><Money value={netWorth.assets} /></dd></div>
            <div><dt className="text-xs text-muted-foreground">Liabilities</dt><dd className="font-semibold"><Money value={netWorth.liabilities} /></dd></div>
          </dl>
        </div>
      </section>

      {!hasData && (
        <Empty title="Nothing tracked yet" description="Add a bank account or mutual fund to start building your net worth." action={<Link className="text-sm font-medium text-primary underline" href="/dashboard/bank-accounts">Add a bank account</Link>} />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Widget title="Bank & cash" href="/dashboard/bank-accounts">
          <p className="mt-1 text-lg font-semibold"><Money value={m.bankTotal} /></p>
          <p className="text-xs text-muted-foreground">{data.bankAccounts.length} account{data.bankAccounts.length === 1 ? "" : "s"}</p>
        </Widget>
        <Widget title="Mutual funds" href="/dashboard/mutual-funds">
          <p className="mt-1 text-lg font-semibold"><Money value={m.portfolio.value} /></p>
          <p className="text-xs text-muted-foreground">{m.portfolio.invested ? <Delta pct={m.portfolio.absReturnPct} /> : 'No funds yet'}{m.portfolio.xirrPct != null && <> · XIRR {formatPct(m.portfolio.xirrPct, 1)}</>}</p>
        </Widget>
        <Widget title="Card outstanding" href="/dashboard/credit-cards">
          <p className="mt-1 text-lg font-semibold"><Money value={m.outstanding} /></p>
          <p className="text-xs text-muted-foreground">{m.limit ? `${m.util}% of ${formatCompactINR(m.limit)} limit` : 'No cards'}</p>
        </Widget>
        <Widget title="Insurance cover" href="/dashboard/insurance">
          <p className="mt-1 text-lg font-semibold"><Money value={m.cover.total} compact /></p>
          <p className="text-xs text-muted-foreground">{m.cover.activeCount} active polic{m.cover.activeCount === 1 ? 'y' : 'ies'}</p>
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Net worth over time" action={<RangeTabs value={range} onChange={setRange} options={RANGES as readonly Range[]} />}>
          {m.series.length < 2 ? (
            <Empty title="Not enough history yet" description="Net worth snapshots build up automatically as your data changes." />
          ) : (
            <div className="h-64" role="img" aria-label="Net worth line chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={m.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="label" {...chartAxis} minTickGap={24} />
                  <YAxis {...chartAxis} width={56} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                  <Tooltip {...chartTooltipStyle} formatter={(v: number) => [privacyMode ? '••••' : formatINR(v), 'Net worth']} />
                  <Line type="monotone" dataKey="netWorth" stroke={chartColor(1)} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Financial health" action={<Link className="text-xs font-medium text-primary hover:underline" href="/dashboard/ai">How it works</Link>}>
          {!ai.health ? <LoadingBlock className="h-24" /> : (
            <>
              <div className="flex items-baseline gap-2"><span className="text-4xl font-semibold">{ai.health.score ?? '—'}</span><span className="text-sm text-muted-foreground">/ 100 · {ai.health.label}</span></div>
              <ul className="mt-3 space-y-2.5">{ai.health.params.filter((p) => p.score != null).slice(0, 5).map((p) => (
                <li key={p.key}><div className="flex justify-between text-xs"><span>{p.name}</span><span className="text-muted-foreground">{p.value}</span></div><Progress value={p.score as number} tone={(p.score as number) < 40 ? 'danger' : (p.score as number) < 70 ? 'warning' : 'primary'} label={p.name} /></li>))}</ul>
            </>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Asset allocation" action={<Link className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" href="/dashboard/net-worth">View in Net Worth<ArrowRight className="h-3 w-3" aria-hidden /></Link>}>
          <Donut data={m.assetPie} total={netWorth.assets} privacy={privacyMode} />
        </Panel>
        <Panel title="Liabilities" action={<Link className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" href="/dashboard/net-worth">View in Net Worth<ArrowRight className="h-3 w-3" aria-hidden /></Link>}>
          <Donut data={m.liabPie} total={netWorth.liabilities} privacy={privacyMode} offset={3} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Income vs expenses">
          <div className="h-60" role="img" aria-label="Income versus expenses bar chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.cashflow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis {...chartAxis} width={48} tickFormatter={(v) => (privacyMode ? '••' : formatCompactINR(v).replace('₹', ''))} />
                <Tooltip {...chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number) => (privacyMode ? '••••' : formatINR(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill={chartColor(1)} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill={chartColor(3)} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="This month's budget" action={<Link className="text-xs font-medium text-primary hover:underline" href="/dashboard/budget">Open</Link>}>
          {!m.pacing ? (
            <Empty title="No budget set" description="Set a monthly budget to see pacing." action={<Link className="text-sm font-medium text-primary underline" href="/dashboard/budget">Set budget</Link>} />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-sm"><span>Spent <Money value={m.pacing.spent} /> of <Money value={m.budget.total} /></span><span className="font-medium">{m.pacing.utilisation}%</span></div>
                <Progress value={m.pacing.utilisation} tone={toneForPct(m.pacing.utilisation)} label="Budget utilisation" />
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Remaining</dt><dd className="font-semibold"><Money value={m.pacing.remaining} compact /></dd></div>
                <div><dt className="text-xs text-muted-foreground">Expected by today</dt><dd className="font-semibold"><Money value={m.pacing.expectedTillToday} compact /></dd></div>
                <div><dt className="text-xs text-muted-foreground">{m.pacing.variance > 0 ? 'Over pace' : 'Under pace'}</dt><dd className={m.pacing.variance > 0 ? 'font-semibold text-destructive' : 'font-semibold text-success'}><Money value={Math.abs(m.pacing.variance)} compact /></dd></div>
              </dl>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Upcoming payments">
          {m.dues.length === 0 ? <Empty title="Nothing due soon" /> : (
            <ul className="divide-y divide-border">
              {m.dues.map((d) => (
                <li key={`${d.kind}-${d.id}`}>
                  <Link href={d.href} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary">
                    <span className="min-w-0"><span className="block truncate font-medium">{d.title}</span><span className="text-xs text-muted-foreground">{d.kind === 'card' ? 'Card payment' : d.kind === 'premium' ? 'Premium' : 'SIP'} · {formatDate(d.date)}</span></span>
                    <Money value={d.amount} className="shrink-0 font-medium" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent transactions">
          {m.recent.length === 0 ? <Empty title="No transactions yet" /> : (
            <ul className="divide-y divide-border">
              {m.recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{t.title}</span><span className="text-xs text-muted-foreground">{t.sub} · {formatDate(t.date)}</span></span>
                  <Money value={t.amount} signed className="shrink-0 font-medium" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <WealthAiWidget />
        <Panel title="AI insights" action={<Link className="text-xs font-medium text-primary hover:underline" href="/dashboard/ai">See all</Link>}><InsightsList limit={4} showRestore={false} /></Panel>
      </div>

      {isDemo && <p className="text-center text-xs text-muted-foreground">You are viewing sample data. Changes stay in this browser only.</p>}
    </div>
  )
}

function Donut({ data, total, privacy, offset = 0 }: { data: { key: string; name: string; value: number }[]; total: number; privacy: boolean; offset?: number }) {
  if (!data.length) return <Empty title="Nothing to show" />
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-48 w-48 shrink-0" role="img" aria-label="Donut chart">
        <div className="relative z-10 h-full w-full"><ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2}>
              {data.map((d, i) => <Cell key={d.key} fill={CHART_PALETTE[(i + offset) % CHART_PALETTE.length]} />)}
            </Pie>
            <Tooltip {...chartTooltipStyle} formatter={(v: number) => (privacy ? '••••' : formatINR(v))} />
          </PieChart>
        </ResponsiveContainer></div>
        <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-semibold"><Money value={total} compact /></span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.key} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CHART_PALETTE[(i + offset) % CHART_PALETTE.length] }} /><span className="truncate">{d.name}</span></span>
            <span className="shrink-0 text-muted-foreground">{total ? Math.round((d.value / total) * 1000) / 10 : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
