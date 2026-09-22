'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  ChevronRight,
  Landmark,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { AllocationBar } from '@/components/ui/allocation-bar'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'
import { withFromHome } from '@/lib/utils/navigation'
import type { DashboardStats } from '@/types/dashboard'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface DashboardHeroProps {
  displayName: string
  authLoading: boolean
  loading: boolean
  stats: DashboardStats
}

export function DashboardHero({
  displayName,
  authLoading,
  loading,
  stats,
}: DashboardHeroProps) {
  const { fmt } = usePrivacyAmount()
  const fmtAmount = (n?: number) => (loading ? '—' : fmt(n ?? 0))

  const savingsRate = stats.savingsRate ?? 0
  const monthlyChange = stats.monthlySavings ?? 0
  const healthLabel =
    savingsRate >= 30 ? 'Strong' : savingsRate >= 15 ? 'Stable' : savingsRate >= 0 ? 'Watch' : 'Deficit'
  const healthVariant =
    savingsRate >= 30 ? 'success' : savingsRate >= 15 ? 'default' : savingsRate >= 0 ? 'warning' : 'danger'

  const cashTotal = (stats.totalBankBalance ?? 0) + (stats.totalCash ?? 0)
  const investmentValue = stats.totalInvestmentValue ?? 0
  const creditDue = stats.totalCreditDue ?? 0
  const loanDue = stats.totalLoanOutstanding ?? 0

  const allocationSegments = [
    { label: 'Cash', value: cashTotal, color: 'hsl(var(--primary))' },
    { label: 'Investments', value: investmentValue, color: 'hsl(var(--success))' },
    { label: 'Credit cards', value: creditDue, color: 'hsl(var(--destructive))' },
    { label: 'Loans', value: loanDue, color: 'hsl(var(--warning))' },
  ].filter((s) => s.value > 0)

  return (
    <section className="surface-card-elevated overflow-hidden">
      <div className="relative border-b border-border/50 px-5 py-6 md:px-8 md:py-7">
        {/* Subtle accent gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-success/[0.03]" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-muted-foreground" suppressHydrationWarning>
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
              {authLoading ? 'Loading…' : displayName}
            </h1>
          </div>
          {!loading && (
            <Badge variant={healthVariant}>
              {healthLabel} · {savingsRate}% saved
            </Badge>
          )}
        </div>

        <div className="relative mt-6 md:mt-8">
          <p className="mm-stat-label">Net worth</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="mm-stat-value-lg">{fmtAmount(stats.netWorth)}</p>
            {!loading && monthlyChange !== 0 && (
              <p
                className={cn(
                  'pb-1 text-sm font-semibold tabular-nums',
                  monthlyChange >= 0 ? 'text-income' : 'text-expense'
                )}
              >
                {monthlyChange >= 0 ? '+' : ''}
                {fmtAmount(monthlyChange)} this month
              </p>
            )}
          </div>
        </div>

        {!loading && allocationSegments.length > 0 && (
          <div className="relative mt-6">
            <AllocationBar segments={allocationSegments} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 divide-y divide-border/50 md:grid-cols-3 md:divide-x md:divide-y-0">
        <SummaryCell label="Total assets" value={fmtAmount(stats.totalAssets)} />
        <SummaryCell label="Liabilities" value={fmtAmount(stats.totalLiabilities)} />
        <SummaryCell
          label="Savings rate"
          value={loading ? '—' : `${savingsRate}%`}
          sub={
            !loading ? (
              <ProgressBar
                value={Math.max(0, savingsRate)}
                max={100}
                size="sm"
                variant={healthVariant === 'danger' ? 'danger' : healthVariant === 'warning' ? 'warning' : 'success'}
                className="mt-2"
              />
            ) : undefined
          }
        />
      </div>
    </section>
  )
}

function SummaryCell({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: ReactNode
}) {
  return (
    <div className="px-5 py-4 md:px-6 md:py-5">
      <p className="mm-stat-label">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tabular-nums md:text-xl">{value}</p>
      {sub}
    </div>
  )
}

export function DashboardQuickActions({ className }: { className?: string }) {
  const actions = [
    {
      label: 'Expense',
      icon: ArrowDownCircle,
      href: withFromHome('/dashboard/transactions/new?type=expense'),
      tone: 'text-expense',
    },
    {
      label: 'Income',
      icon: ArrowUpCircle,
      href: withFromHome('/dashboard/transactions/new?type=income'),
      tone: 'text-income',
    },
    {
      label: 'Transfer',
      icon: ArrowLeftRight,
      href: withFromHome('/dashboard/transactions/new?type=transfer'),
      tone: 'text-warning',
    },
  ]

  return (
    <div className={cn('grid grid-cols-3 gap-2.5', className)}>
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Tooltip key={action.label} content={`Add ${action.label.toLowerCase()}`} side="bottom">
            <Link href={action.href} className="finance-action-btn group">
              <div className="finance-action-icon">
                <Icon className={cn('h-5 w-5', action.tone)} strokeWidth={1.75} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{action.label}</span>
            </Link>
          </Tooltip>
        )
      })}
    </div>
  )
}

export const DASHBOARD_METRIC_LINKS = [
  {
    title: 'Cash & bank',
    valueKey: 'totalBankBalance' as const,
    subtitleKey: 'totalCash' as const,
    subtitleLabel: 'Cash',
    icon: Wallet,
    href: withFromHome('/dashboard/accounts'),
    variant: 'default' as const,
    combineCash: true,
  },
  {
    title: 'Investments',
    valueKey: 'totalInvestmentValue' as const,
    subtitleKey: 'investmentGain' as const,
    subtitleLabel: 'Gain/loss',
    icon: TrendingUp,
    href: withFromHome('/dashboard/investments'),
    variant: 'success' as const,
  },
  {
    title: 'Liabilities',
    valueKey: 'totalLiabilities' as const,
    subtitleKey: 'loanCount' as const,
    subtitleLabel: 'Loans',
    icon: Landmark,
    href: withFromHome('/dashboard/loans'),
    variant: 'danger' as const,
    isCount: true,
    format: 'number' as const,
  },
  {
    title: 'This month',
    valueKey: 'monthlyExpenses' as const,
    subtitleKey: 'monthlyIncome' as const,
    subtitleLabel: 'Income',
    icon: ReceiptText,
    href: withFromHome('/dashboard/transactions'),
    variant: 'warning' as const,
  },
]

export function MetricSubtitle({
  stats,
  loading,
  subtitleKey,
  subtitleLabel,
  isCount,
  isPercent,
}: {
  stats: DashboardStats
  loading: boolean
  subtitleKey: keyof DashboardStats
  subtitleLabel: string
  isCount?: boolean
  isPercent?: boolean
}) {
  const { fmt } = usePrivacyAmount()

  if (loading) return `${subtitleLabel}: —`

  const raw = stats[subtitleKey]
  if (isCount) return `${subtitleLabel}: ${raw ?? 0}`
  if (isPercent) return `${subtitleLabel}: ${raw ?? 0}%`

  const num = Number(raw) || 0
  return `${subtitleLabel}: ${fmt(num)}`
}

export function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mm-pill mm-pill-active transition-opacity hover:opacity-80"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  )
}
