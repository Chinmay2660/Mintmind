'use client'

import { netWorthGroups } from '@/lib/wealth/netWorthGroups'
import { InstallBanner } from '@/components/shell/InstallApp'
import Link from 'next/link'
import { ArrowRight, BarChart3, Banknote, Car, ChevronDown, ChevronRight, Coins, GraduationCap, PiggyBank, TrendingUp, User, CreditCard, Home, Percent, Plus, Landmark, PieChart as PieIcon, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'
import { AttentionStrip } from '@/components/dashboard/AttentionStrip'
import { SnapCarousel } from '@/components/ui/snap-carousel'
import { TxnRow } from '@/components/wealth/budget/TxnRow'
import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWealth } from '@/lib/wealth/WealthContext'
import { toISO } from '@/lib/wealth/calc'
import { budgetPacing, dayChange, growthVs, healthScore, portfolioSummary, rangeStart, cardUtilisation } from '@/lib/wealth/calc'
import { ASSET_LABELS, LIABILITY_LABELS } from '@/lib/wealth/labels'
import { coverageTotals, incomeVsExpenses, monthLabel } from '@/lib/wealth/selectors'
import { upcomingCardDues, upcomingPremiums, upcomingSips } from '@/lib/wealth/reminders'
import { cn } from '@/lib/utils'
import { assetValue } from '@/lib/wealth/holdings'
import { formatCompactINR, formatDate, formatINR, formatPct } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { CHART_PALETTE, Delta, Empty, InfoTip, Metric, UsagePct, LoadingBlock, Panel, Progress, RangeTabs, chartAxis, chartColor, chartGrid, chartTooltipStyle, toneForPct, FootNote } from '@/components/wealth/kit'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useAi } from '@/components/ai/useAi'
import { useFeatures } from '@/lib/features/FeaturesContext'
import dynamic from 'next/dynamic'

// drag and drop (framer-motion) is only needed once someone opens Customize
import { useDashboardLayout, DASHBOARD_BLOCKS } from '@/components/dashboard/useDashboardLayout'

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'] as const
type Range = (typeof RANGES)[number]

const TINTS = {
  lime: 'bg-highlight/30 text-[hsl(85_60%_26%)] dark:bg-highlight/20 dark:text-highlight',
  purple: 'bg-primary/15 text-primary',
  peach: 'bg-chart-2/20 text-[hsl(24_80%_38%)] dark:text-chart-2',
  blue: 'bg-chart-4/15 text-chart-4',
} as const

/** A tiny trend line from real saved history. Drawn only when there are at least two points. */
function Spark({ points, label, lowerIsBetter }: { points?: number[]; label: string; lowerIsBetter?: boolean }) {
  if (!points || points.length < 2) return null
  const min = Math.min(...points), max = Math.max(...points)
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${((i / (points.length - 1)) * 100).toFixed(1)},${(22 - ((v - min) / (max - min || 1)) * 18).toFixed(1)}`).join(' ')
  const rising = points[points.length - 1] >= points[0]
  const good = lowerIsBetter ? !rising : rising
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="mt-2 h-6 w-full">
      <path d={d} fill="none" stroke={good ? 'hsl(var(--chart-up, var(--success)))' : 'hsl(var(--destructive))'} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Widget({ title, href, icon: Icon, tint, children, spark }: { title: string; href: string; icon: LucideIcon; tint: keyof typeof TINTS; children: React.ReactNode; spark?: { points?: number[]; label: string; lowerIsBetter?: boolean } }) {
  return (
    <Link href={href} className="group surface-card flex flex-col p-4 outline-none transition-all motion-safe:hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TINTS[tint]}`}><Icon className="h-5 w-5" aria-hidden /></span>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{title}</p>
      {children}
      {spark && <Spark points={spark.points} label={spark.label} lowerIsBetter={spark.lowerIsBetter} />}
    </Link>
  )
}


export default function DashboardPage() {
  const { ready, data, netWorth, isDemo } = useWealth()
  const { privacyMode } = usePrivacyMode()
  const ai = useAi()
  const { isEnabled } = useFeatures()
  const [range, setRange] = useState<Range>('1Y')
  const [hoverPt, setHoverPt] = useState<{ date: string; v: number } | null>(null) // the point being touched or hovered on the chart
  const [heroRange, setHeroRange] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('1M')
  const [moneyTab, setMoneyTab] = useState<'assets' | 'liabilities'>('assets')
  const [moneySub, setMoneySub] = useState('') // which group's list is open under Assets or Liabilities
  const today = useMemo(() => new Date(), [])
  const layout = useDashboardLayout(DASHBOARD_BLOCKS)

  const m = useMemo(() => {
    if (!ready) return null
    const ym = today.toISOString().slice(0, 7)
    const nwNow = netWorth.netWorth
    const monthGrowth = growthVs(data.snapshots, nwNow, 1, today)
    const dayMove = dayChange(data.meta.find((x: any) => x.key === 'nwDaily')?.value, nwNow, today)
    const yearGrowth = growthVs(data.snapshots, nwNow, 12, today)
    const snaps = [...data.snapshots].sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-8)
    const trail = (pick: (x: any) => unknown) => { const v = snaps.map(pick); return v.every((n) => typeof n === 'number') ? (v as number[]) : undefined }
    const sparks = { bank: trail((x) => x.assetBreakdown?.bank), funds: trail((x) => x.assetBreakdown?.mutualFunds), cards: trail((x) => x.liabilityBreakdown?.creditCards) }
    const quarterGrowth = growthVs(data.snapshots, nwNow, 3, today)
    const lastSnapshot = [...data.snapshots].sort((a: any, b: any) => b.date.localeCompare(a.date))[0]?.date ?? null
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
    ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
    const assetPie = Object.entries(netWorth.assetBreakdown).filter(([, v]) => v > 0).map(([k, v]) => ({ key: k, name: ASSET_LABELS[k as keyof typeof ASSET_LABELS] ?? k, value: v }))
    const liabPie = Object.entries(netWorth.liabilityBreakdown).filter(([, v]) => v > 0).map(([k, v]) => ({ key: k, name: LIABILITY_LABELS[k as keyof typeof LIABILITY_LABELS] ?? k, value: v }))
    const recent = [
      ...data.expenses.map((e) => ({ id: e.id, date: e.date, title: e.note || e.category, sub: e.category, amount: -e.amount })),
      ...data.bankTxns.filter((t) => t.type === 'income').map((t) => ({ id: t.id, date: t.date, title: t.description, sub: 'Income', amount: t.amount })),
    ]  .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    return { dayMove, sparks, monthGrowth, quarterGrowth, yearGrowth, lastSnapshot, series, pacing, budget, portfolio, cover, limit, outstanding, util, bankTotal, health, dues, assetPie, liabPie, recent, cashflow: incomeVsExpenses(data.bankTxns, data.expenses, 6, today), prevMonthNW: monthGrowth?.base }
  }, [ready, data.snapshots, data.budgets, data.expenses, data.funds, data.fundTxns, data.sips, data.policies, data.cards, data.bankAccounts, data.bankTxns, data.meta, netWorth, range, today])

  // The chart under the headline: saved month-end values, the daily record, and today's live figure, from the start of the chosen range.
  const hero = useMemo(() => {
    if (!ready) return null
    const pts = new Map<string, number>()
    for (const sn of data.snapshots) pts.set(sn.date, sn.netWorth)
    for (const d of (data.meta.find((x: any) => x.key === 'nwDaily')?.value ?? []) as { date: string; netWorth: number }[]) pts.set(d.date, d.netWorth)
    pts.set(toISO(today), netWorth.netWorth)
    const all = [...pts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, v }))
    const days = { '1W': 7, '1M': 30, '3M': 91, '6M': 182, '1Y': 365, ALL: 100000 }[heroRange]
    const startIso = toISO(new Date(today.getTime() - days * 86400000))
    let base = all[0]
    for (const pt of all) if (pt.date <= startIso) base = pt // the value at the start of the window: the last point on or before it
    const series = all.filter((pt) => pt.date >= base.date)
    const diff = netWorth.netWorth - base.v
    return { series, diff, base: base.v, pct: base.v ? (diff / Math.abs(base.v)) * 100 : null }
  }, [ready, data.snapshots, data.meta, netWorth.netWorth, heroRange, today])

  if (!ready || !m) {
    return (
      <div className="space-y-4">
        <LoadingBlock className="h-40" />
        <div className="grid gap-4 md:grid-cols-2"><LoadingBlock className="h-72" /><LoadingBlock className="h-72" /></div>
      </div>
    )
  }

  const hasData = netWorth.assets > 0 || netWorth.liabilities > 0

  const assetHoldings = (key: string): Holding[] => key === 'bank' ? data.bankAccounts.map((b: any) => ({ name: b.nickname || b.bankName, value: b.currentBalance }))
    : key === 'mutualFunds' ? data.funds.map((f: any) => ({ name: f.name || f.schemeName || 'Fund', value: f.currentValue }))
    : data.assets.filter((a: any) => a.category === key).map((a: any) => ({ name: a.name, value: assetValue(a) || 0 }))
  const liabHoldings = (key: string): Holding[] => key === 'creditCards' ? data.cards.map((c: any) => ({ name: `${c.bank} ${c.cardName}`, value: c.outstanding }))
    : data.liabilities.filter((l: any) => l.category === key).map((l: any) => ({ name: l.name, value: Number(l.outstanding) || 0 }))
  // Assets | Liabilities, and under each a tab for every group (Investments, Banks, Insurance ... / Credit cards, Loans).
  // The open group lists what is in it; each row opens its page.
  // each row gets an icon of its own kind (a fund, a deposit, gold, a car loan...); the group's icon is the fallback
  const KIND_ICON: Record<string, LucideIcon> = {
    mutualFunds: PieIcon, stocks: TrendingUp, etf: BarChart3, fd: Landmark, rd: Banknote, epf: PiggyBank, ppf: PiggyBank, nps: PiggyBank, gold: Coins,
    realEstate: Home, vehicle: Car, other: Wallet, bank: Landmark, cash: Banknote, card: CreditCard,
    health: ShieldCheck, life: ShieldCheck, term: ShieldCheck, motor: Car, home: Home,
    homeLoan: Home, carLoan: Car, personalLoan: User, educationLoan: GraduationCap, otherLoan: Percent,
  }
  const GROUP_ICON: Record<string, LucideIcon> = { invest: PieIcon, banks: Landmark, property: Home, insurance: ShieldCheck, cards: CreditCard, loans: Percent }
  const groups = netWorthGroups({ assetBreakdown: netWorth.assetBreakdown as any, bankAccounts: data.bankAccounts, cards: data.cards, liabilities: data.liabilities, cover: isEnabled('insurance') ? m.cover.total : 0, coverCount: m.cover.activeCount, funds: data.funds, balanceHistory: data.balanceHistory, expenses: data.expenses, cardPayments: data.cardPayments, todayIso: toISO(today), policies: data.policies.filter((p: any) => !p.endDate || p.endDate >= toISO(today)), labels: ASSET_LABELS as any })
  const shownGroups = (moneyTab === 'assets' ? groups.assets : groups.liabilities).filter((g) => g.key !== 'banks' || isEnabled('bank_accounts')).filter((g) => g.key !== 'cards' || isEnabled('credit_cards'))
  const tabTotal = moneyTab === 'assets' ? netWorth.assets : netWorth.liabilities
  const openGroup = shownGroups.find((g) => g.key === moneySub) ?? shownGroups[0]
  const GroupIcon = openGroup ? GROUP_ICON[openGroup.key] ?? Wallet : Wallet
  const groupRows = openGroup ? (openGroup.children.length ? openGroup.children : [{ key: openGroup.key, label: openGroup.label, value: openGroup.value, href: openGroup.href }]) : []

  const blocks: Record<string, React.ReactNode> = {
    accounts: (
      <section aria-label="Net worth breakdown" className="surface-card p-4 sm:p-5">
        <div role="tablist" aria-label="Assets or liabilities" className="flex gap-7 border-b border-border">
          {([['assets', 'Assets', netWorth.assets], ['liabilities', 'Liabilities', netWorth.liabilities]] as const).map(([k, l, v]) => (
            <button key={k} type="button" role="tab" aria-selected={moneyTab === k} onClick={() => { setMoneyTab(k); setMoneySub('') }} className={cn('-mb-px border-b-2 pb-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', moneyTab === k ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              <span className="block text-xs font-medium">{l}</span><span className={cn('block text-lg font-semibold tabular-nums', moneyTab === k && 'text-foreground')}><Money value={v} /></span>
            </button>))}
        </div>
        {shownGroups.length === 0
          ? <p className="py-8 text-center text-sm text-muted-foreground">{moneyTab === 'assets' ? 'Add a bank account or an investment to start.' : 'No loans or card dues.'}</p>
          : <>
              <div role="tablist" aria-label={moneyTab === 'assets' ? 'Kinds of assets' : 'Kinds of liabilities'} className="flex flex-wrap gap-2 py-3">
                {shownGroups.map((g) => (
                  <button key={g.key} type="button" role="tab" aria-selected={openGroup?.key === g.key} onClick={() => setMoneySub(g.key)} className={cn('min-h-9 rounded-full border px-3.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', openGroup?.key === g.key ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{g.label}</button>
                ))}
              </div>
              {openGroup && (
                <div className="flex items-baseline justify-between gap-3 pb-1">
                  <p className="text-xs text-muted-foreground">{openGroup.uncounted ? openGroup.note : tabTotal > 0 ? `${Math.round((openGroup.value / tabTotal) * 100)}% of ${moneyTab}` : ''}</p>
                  <Link href={openGroup.href} className="-my-2 inline-flex shrink-0 items-center gap-0.5 py-2 text-xs font-medium text-primary hover:underline">Open<ChevronRight className="h-3.5 w-3.5" aria-hidden /></Link>
                </div>
              )}
              <ul className="divide-y divide-border">
                {groupRows.map((r) => (
                  <li key={r.key}>
                    <Link href={r.href} className="group flex min-h-14 items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {(() => { const RowIcon = ('kind' in r && KIND_ICON[(r as any).kind]) || GroupIcon; return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden><RowIcon className="h-5 w-5" /></span> })()}
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{r.label}</span>{openGroup && openGroup.value > 0 && !openGroup.uncounted && <span className="block text-xs text-muted-foreground">{Math.round((r.value / openGroup.value) * 100)}% of {openGroup.label.toLowerCase()}</span>}</span>
                      <span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums"><Money value={r.value} compact={!!openGroup?.uncounted} /></span>{'dayChange' in r && (r as any).dayChange != null && <span className="block text-xs tabular-nums"><Delta amount={(r as any).dayChange} pct={(r as any).dayPct} invertGood={!!(r as any).inverted} /> <span className="text-muted-foreground">1D</span></span>}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
                    </Link>
                  </li>))}
              </ul>
            </>}
        {isEnabled('budget_expenses') && (
          <Link href="/dashboard/budget" className="mt-3 flex min-h-14 items-center justify-between gap-3 border-t border-border pt-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">This month's budget</span><span className="block text-xs text-muted-foreground">{m.pacing ? <>of <Money value={m.budget.total} compact /> spent</> : 'Not set yet'}</span>{m.pacing && <span className="mt-1.5 block"><Progress value={m.pacing.utilisation} tone={toneForPct(m.pacing.utilisation)} label="Budget used" /></span>}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{m.pacing ? <Money value={m.pacing.spent} /> : <span className="text-primary">Set up</span>}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        )}
      </section>
    ),
    summary: (
      <SnapCarousel label="Account summaries" cols={4} itemWidth="w-[62%]">
        {isEnabled('bank_accounts') && <Widget title="Bank & cash" href="/dashboard/bank-accounts" icon={Landmark} tint="lime" spark={{ points: m.sparks.bank, label: 'Bank and cash' }}>
          <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight"><Money value={m.bankTotal} /></p>
          <p className="text-xs text-muted-foreground">{data.bankAccounts.length} account{data.bankAccounts.length === 1 ? "" : "s"}</p>
        </Widget>}
        {isEnabled('mutual_funds') && <Widget title="Mutual funds" href="/dashboard/mutual-funds" icon={PieIcon} tint="purple" spark={{ points: m.sparks.funds, label: 'Mutual funds' }}>
          <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight"><Money value={m.portfolio.value} /></p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{m.portfolio.invested ? <Delta pill pct={m.portfolio.absReturnPct} /> : <span>No funds yet</span>}{m.portfolio.xirrPct != null && <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span>XIRR</span><Metric pct={m.portfolio.xirrPct} /></span>}</div>
        </Widget>}
        {isEnabled('credit_cards') && <Widget title="Card outstanding" href="/dashboard/credit-cards" icon={CreditCard} tint="peach" spark={{ points: m.sparks.cards, label: 'Card outstanding', lowerIsBetter: true }}>
          <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight"><Money value={m.outstanding} /></p>
          <p className="text-xs text-muted-foreground">{m.limit ? <><UsagePct value={m.util} /> of {formatCompactINR(m.limit)} limit</> : 'No cards'}</p>
        </Widget>}
        {isEnabled('insurance') && <Widget title="Insurance cover" href="/dashboard/insurance" icon={ShieldCheck} tint="blue">
          <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight"><Money value={m.cover.total} compact /></p>
          <p className="text-xs text-muted-foreground">{m.cover.activeCount} active polic{m.cover.activeCount === 1 ? 'y' : 'ies'}</p>
        </Widget>}
      </SnapCarousel>
    ),
    networth: (
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Net worth over time" action={<RangeTabs value={range} onChange={setRange} options={RANGES as readonly Range[]} />}>
          {m.series.length < 2 ? (
            <Empty title="Not enough history yet" description="Net worth snapshots build up automatically as your data changes." />
          ) : (
            <div className="h-64">
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

        <Panel title="Financial health" action={<Link className="-my-2 inline-flex shrink-0 items-center whitespace-nowrap py-2 text-xs font-medium text-primary hover:underline" href="/dashboard/ai">How it works</Link>}>
          {!ai.health ? <LoadingBlock className="h-24" /> : (
            <>
              <div className="flex items-baseline gap-2"><span className="text-4xl font-semibold">{ai.health.score ?? '-'}</span><span className="text-sm text-muted-foreground">/ 100 · {ai.health.label}</span></div>
              <ul className="mt-3 space-y-2.5">{ai.health.params.filter((p) => p.score != null).slice(0, 5).map((p) => (
                <li key={p.key}>{(() => { const [main, ...more] = String(p.value).split(', '); return (
                  <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5"><span className="truncate">{p.name}</span>{more.length > 0 && <InfoTip label={p.name}>{String(p.value)}</InfoTip>}</span>
                    <span className="whitespace-nowrap text-right tabular-nums text-muted-foreground">{main}</span>
                  </div>) })()}<Progress value={p.score as number} tone={(p.score as number) < 40 ? 'danger' : (p.score as number) < 70 ? 'warning' : 'primary'} label={p.name} /></li>))}</ul>
            </>
          )}
        </Panel>
      </div>
    ),
    allocation: (
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Asset allocation" action={<Link className="-my-2 inline-flex shrink-0 items-center gap-1 whitespace-nowrap py-2 text-xs font-medium text-primary hover:underline" href="/dashboard/net-worth">View in Net Worth<ArrowRight className="h-3 w-3" aria-hidden /></Link>}>
          <Donut data={m.assetPie} total={netWorth.assets} privacy={privacyMode} holdings={assetHoldings} />
        </Panel>
        <Panel title="Liabilities" action={<Link className="-my-2 inline-flex shrink-0 items-center gap-1 whitespace-nowrap py-2 text-xs font-medium text-primary hover:underline" href="/dashboard/net-worth">View in Net Worth<ArrowRight className="h-3 w-3" aria-hidden /></Link>}>
          <Donut data={m.liabPie} total={netWorth.liabilities} privacy={privacyMode} offset={3} holdings={liabHoldings} />
        </Panel>
      </div>
    ),
    spending: (
      <div className="grid gap-4 lg:grid-cols-2">
        {isEnabled('budget_expenses') && <Panel title="Income vs expenses">
          <div className="h-60">
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
        </Panel>}

        {isEnabled('budget_expenses') && <Panel title="This month's budget" action={<Link className="text-xs font-medium text-primary hover:underline" href="/dashboard/budget">Open</Link>}>
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
        </Panel>}
      </div>
    ),
    payments: (
      <div className="grid gap-4 lg:grid-cols-2">
        {(isEnabled('credit_cards') || isEnabled('insurance') || isEnabled('mutual_funds')) && <Panel title="Coming up">
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
        </Panel>}
        <Panel title="Recent transactions" action={<Link className="-my-2 inline-flex shrink-0 items-center gap-1 whitespace-nowrap py-2 text-xs font-medium text-primary hover:underline" href="/dashboard/ledger">See all<ArrowRight className="h-3 w-3" aria-hidden /></Link>}>
          {m.recent.length === 0 ? <Empty title="No transactions yet" /> : (
            <ul className="divide-y divide-border">
              {m.recent.map((t) => <TxnRow key={t.id} kind={t.amount < 0 ? 'expense' : 'income'} title={t.title} category={t.sub} meta={`${t.sub} · ${formatDate(t.date)}`} amount={t.amount} />)}
            </ul>
          )}
        </Panel>
      </div>
    ),
  }
  const visible = layout.order.filter((id) => !layout.hidden.includes(id))

  return (
    <div className="space-y-5">
      <InstallBanner />
      <section className="surface-card relative overflow-hidden p-5 sm:p-6" aria-label="Net worth summary">
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary"><Wallet className="h-5 w-5" /></span>
              <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">Net worth</p>
            </div>
            <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums md:text-5xl"><Money value={netWorth.netWorth} /></p>
            {/* the headline change is today's; the chart below has its own range, with that range's change */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-2"><Delta pill amount={m.dayMove.diff} pct={m.dayMove.pct} /><span className="text-xs text-muted-foreground">today</span></span>
            </div>
          </div>
        </div>
        {hero && (
          <div className="mt-5">
            {(() => {
              const up = hero.diff >= 0
              const col = up ? 'hsl(var(--chart-up, var(--success)))' : 'hsl(var(--destructive))'
              const LABEL = { '1W': 'Past week', '1M': 'Past month', '3M': 'Past 3 months', '6M': 'Past 6 months', '1Y': 'Past year', ALL: 'All time' }[heroRange]
              return (
                <>
                  {/* one readout line above the chart: the range's change, or the touched point (so nothing covers the line) */}
                  <div className="flex min-h-7 items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                    {hoverPt
                      ? <><span className="font-semibold tabular-nums text-foreground">{privacyMode ? '••••' : formatINR(hoverPt.v)}</span><span>{formatDate(hoverPt.date)}</span><Delta pill amount={hoverPt.v - hero.base} pct={hero.base ? ((hoverPt.v - hero.base) / Math.abs(hero.base)) * 100 : null} /></>
                      : <>{LABEL}<Delta pill amount={hero.diff} pct={hero.pct} /></>}
                  </div>
                  {hero.series.length < 2
                    ? <p className="flex h-36 items-center justify-center text-sm text-muted-foreground">Not enough history for this range yet.</p>
                    : (
                      <div className="mt-1 h-40 select-none sm:h-48" role="img" aria-label={`Net worth over the ${LABEL.toLowerCase()}, ${up ? 'up' : 'down'} ${formatINR(Math.abs(hero.diff))}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={hero.series} margin={{ top: 10, right: 8, left: 8, bottom: 6 }}
                            onMouseMove={(st: any) => { const pt = st?.activePayload?.[0]?.payload; if (pt) setHoverPt((cur) => (cur && cur.date === pt.date ? cur : { date: pt.date, v: pt.v })) }}
                            onMouseLeave={() => setHoverPt(null)}>
                            <defs><linearGradient id="nwHeroFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={0.22} /><stop offset="100%" stopColor={col} stopOpacity={0} /></linearGradient></defs>
                            <XAxis dataKey="date" hide />
                            {/* a little room above and below, so the line never touches the edge */}
                            <YAxis hide domain={[(min: number) => min - Math.max(1, (hero.series.reduce((m2, x) => Math.max(m2, x.v), min) - min) * 0.12), (max: number) => max + Math.max(1, (max - hero.series.reduce((m2, x) => Math.min(m2, x.v), max)) * 0.12)]} />
                            <Tooltip content={() => null} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3', strokeOpacity: 0.6 }} />
                            <Area type="monotone" dataKey="v" stroke={col} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" fill="url(#nwHeroFill)" isAnimationActive={false}
                              dot={(dp: any) => (dp.index === hero.series.length - 1 && !hoverPt
                                ? <g key="end"><circle cx={dp.cx} cy={dp.cy} r={7} fill={col} fillOpacity={0.18} /><circle cx={dp.cx} cy={dp.cy} r={3.5} fill={col} stroke="hsl(var(--card))" strokeWidth={1.5} /></g>
                                : <g key={dp.index} />)}
                              activeDot={{ r: 4.5, fill: col, stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  <div role="tablist" aria-label="Chart range" className="mt-1 flex items-center justify-between">
                    {(['1W', '1M', '3M', '6M', '1Y', 'ALL'] as const).map((r) => (
                      <button key={r} type="button" role="tab" aria-selected={heroRange === r} onClick={() => setHeroRange(r)} className={cn('min-h-9 min-w-11 rounded-full px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring', heroRange === r ? 'bg-accent text-primary' : 'text-muted-foreground hover:text-foreground')}>{r === 'ALL' ? 'All' : r}</button>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </section>

      {!hasData && (
        <Empty title="Nothing tracked yet" description="Add a bank account or mutual fund to start building your net worth." action={<Link className="text-sm font-medium text-primary underline" href="/dashboard/bank-accounts">Add a bank account</Link>} />
      )}

      <AttentionStrip />
      <div className="grid gap-5 lg:grid-cols-2">{visible.map((id) => <div key={id} className={cn('min-w-0', layout.half.includes(id) ? '[&>div.grid]:!grid-cols-1 [&>div.grid>*]:!col-span-1' : 'lg:col-span-2')}>{blocks[id]}</div>)}</div>






      <p className="text-center text-sm"><Link href="/dashboard/settings?tab=features" className="font-medium text-primary hover:underline">Explore more features</Link></p>

      {isDemo && <FootNote label="Sample data" className="justify-center">You are viewing sample data. Changes stay in this browser only.</FootNote>}
    </div>
  )
}

type Holding = { name: string; value: number }
function Donut({ data, total, privacy, offset = 0, holdings }: { data: { key: string; name: string; value: number }[]; total: number; privacy: boolean; offset?: number; holdings?: (key: string) => Holding[] }) {
  const [sel, setSel] = useState<string | null>(null)
  if (!data.length) return <Empty title="Nothing to show" />
  const pick = (k: string) => setSel((cur) => (cur === k ? null : k))
  const chosen = sel ? data.find((d) => d.key === sel) : null
  const rows = chosen && holdings ? holdings(chosen.key).filter((h) => h.value > 0).sort((x, y) => y.value - x.value) : []
  return (
    <div>
      <div className="flex flex-col items-center gap-4 lg:flex-row">
        <div className="relative h-48 w-48 shrink-0">
          <div className="relative z-10 h-full w-full"><ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2} onClick={(d: any) => d?.key && pick(d.key)} className="cursor-pointer">
                {data.map((d, i) => <Cell key={d.key} fill={CHART_PALETTE[(i + offset) % CHART_PALETTE.length]} fillOpacity={sel && sel !== d.key ? 0.3 : 1} />)}
              </Pie>
              <Tooltip {...chartTooltipStyle} formatter={(v: number) => (privacy ? '••••' : formatINR(v))} />
            </PieChart>
          </ResponsiveContainer></div>
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground">{chosen ? chosen.name : 'Total'}</span>
            <span className="text-sm font-semibold"><Money value={chosen ? chosen.value : total} compact /></span>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-0.5 text-sm">
          {data.map((d, i) => (
            <li key={d.key}>
              <button type="button" onClick={() => pick(d.key)} aria-pressed={sel === d.key} className={cn('flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', sel === d.key && 'bg-muted')}>
                <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CHART_PALETTE[(i + offset) % CHART_PALETTE.length] }} /><span className="truncate">{d.name}</span></span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{total ? Math.round((d.value / total) * 1000) / 10 : 0}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {chosen && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-medium">{chosen.name}: what is in it</p>
            <button type="button" onClick={() => setSel(null)} className="rounded px-1.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">Clear</button>
          </div>
          {rows.length === 0 ? <p className="text-xs text-muted-foreground">No individual holdings to list for this category.</p> : (
            <ul className="divide-y divide-border text-sm">{rows.map((h, i) => (
              <li key={h.name + i} className="flex items-center justify-between gap-3 py-1.5"><span className="min-w-0 truncate">{h.name}</span><span className="shrink-0 tabular-nums"><Money value={h.value} /><span className="ml-2 text-xs text-muted-foreground">{chosen.value ? Math.round((h.value / chosen.value) * 100) : 0}%</span></span></li>
            ))}</ul>
          )}
        </div>
      )}
    </div>
  )
}
