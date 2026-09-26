'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertOctagon, AlertTriangle, ArrowRight } from 'lucide-react'
import { endOfMonth, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import Link from 'next/link'
import { CashFlowChart } from './_components/CashFlowChart'
import { SavingsGoalsCard, type DashboardGoal } from './_components/SavingsGoalsCard'
import { RecentTransactions, type DashboardTransaction } from './_components/RecentTransactions'
import {
  CategoryBreakdownCard,
  type CategoryStat,
} from './stats/_components/CategoryBreakdownCard'
import { ChartCard } from '@/components/ui/chart-card'
import { FinanceStatCard } from '@/components/ui/finance-stat-card'
import { SectionHeader } from '@/components/ui/section-header'
import {
  DashboardHero,
  DashboardQuickActions,
  DASHBOARD_METRIC_LINKS,
  MetricSubtitle,
  ViewAllLink,
} from './_components/DashboardHero'
import { withFromHome } from '@/lib/utils/navigation'
import type { DashboardStats } from '@/types/dashboard'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { fetchDashboardStats, fetchTransactionStats } from '@/lib/api/stats'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'
import { findSpendingAlerts } from '@/lib/utils/dashboardInsights'
import { cn } from '@/lib/utils'

const RECENT_TRANSACTION_COUNT = 6
const MAX_SPENDING_ALERTS = 3
// ponytail: cash flow + alerts are computed client-side from the latest 1000 transactions
// (API max). Heavy users may see older months undercounted; move to a server aggregation if so.
const TRANSACTIONS_URL = '/api/transactions?limit=1000'

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id
  const [stats, setStats] = useState<DashboardStats>({})
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([])
  const [goals, setGoals] = useState<DashboardGoal[] | null>([])
  const [incomeCategories, setIncomeCategories] = useState<CategoryStat[]>([])
  const [expenseCategories, setExpenseCategories] = useState<CategoryStat[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const now = new Date()

    const [statsData, txRes, categoryStats, goalsRes] = await Promise.all([
      fetchDashboardStats(),
      request.get(TRANSACTIONS_URL),
      fetchTransactionStats({
        startDate: startOfMonth(now).toISOString(),
        endDate: endOfMonth(now).toISOString(),
        types: 'income,expense',
      }),
      // Goals are secondary: a failure here shouldn't blank the whole dashboard.
      request.get('/api/goals').catch((err) => {
        console.error('Failed to load goals', err)
        return null
      }),
    ])

    setStats(statsData || {})
    setTransactions(Array.isArray(txRes.data) ? txRes.data : [])
    setIncomeCategories(categoryStats?.incomeCategoryWise ?? [])
    setExpenseCategories(categoryStats?.categoryWise ?? [])
    setGoals(goalsRes ? (Array.isArray(goalsRes.data) ? goalsRes.data : []) : null)
  }, [])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    loadData()
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load dashboard data')
          setStats({})
          setTransactions([])
          setGoals([])
          setIncomeCategories([])
          setExpenseCategories([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, loadData])

  useSyncedRefresh(loadData)

  const displayName = user?.name || user?.email?.split('@')[0] || 'Guest'
  const spendingAlerts = useMemo(
    () => findSpendingAlerts(transactions).slice(0, MAX_SPENDING_ALERTS),
    [transactions]
  )

  return (
    <>
      <DashboardHero
        displayName={displayName}
        authLoading={authLoading}
        loading={loading}
        stats={stats}
      />

      <DashboardQuickActions className="md:hidden" />

      {!loading && spendingAlerts.length > 0 && (
        <div className="space-y-2">
          {spendingAlerts.map((alert) => (
            <SpendingAlertBanner key={alert.category} alert={alert} />
          ))}
        </div>
      )}

      <section>
        <SectionHeader title="Overview" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 lg:grid-cols-4">
          {DASHBOARD_METRIC_LINKS.map((metric) => {
            let value = stats[metric.valueKey] ?? 0
            if (metric.combineCash) {
              value = (stats.totalBankBalance ?? 0) + (stats.totalCash ?? 0)
            }

            return (
              <FinanceStatCard
                key={metric.title}
                title={metric.title}
                value={Number(value) || 0}
                subtitle={MetricSubtitle({
                  stats,
                  loading,
                  subtitleKey: metric.subtitleKey,
                  subtitleLabel: metric.subtitleLabel,
                  isCount: (metric as { isCount?: boolean }).isCount,
                })}
                icon={metric.icon}
                href={metric.href}
                loading={loading}
                variant={metric.variant}
              />
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
        <ChartCard
          title="Cash flow"
          subtitle="Income vs expenses, last 6 months"
          loading={loading}
          className="min-w-0 lg:col-span-8"
          action={<ViewAllLink href={withFromHome('/dashboard/stats')} label="Stats" />}
        >
          <CashFlowChart transactions={transactions} />
        </ChartCard>

        <SavingsGoalsCard
          goals={goals}
          loading={loading}
          className="min-w-0 lg:col-span-4"
          onGoalAdded={() => {
            loadData().catch(() => toast.error('Goal saved, but the dashboard failed to refresh'))
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <CategoryBreakdownCard
          title="Income"
          categories={incomeCategories}
          total={stats.monthlyIncome ?? 0}
          loading={loading}
        />
        <CategoryBreakdownCard
          title="Expenses"
          categories={expenseCategories}
          total={stats.monthlyExpenses ?? 0}
          loading={loading}
        />
      </div>

      <section>
        <SectionHeader
          title="Recent transactions"
          action={<ViewAllLink href={withFromHome('/dashboard/transactions')} label="All" />}
        />
        <RecentTransactions
          transactions={transactions.slice(0, RECENT_TRANSACTION_COUNT)}
          loading={loading}
        />
      </section>

    </>
  )
}

type SpendingAlert = ReturnType<typeof findSpendingAlerts>[number]

const ALERT_TONES = {
  warning: {
    icon: AlertTriangle,
    box: 'border-warning/30 bg-warning/10',
    badge: 'text-warning sm:bg-warning/15',
    button: 'border-warning/30 hover:bg-warning/15',
  },
  critical: {
    icon: AlertOctagon,
    box: 'border-expense/30 bg-expense/10',
    badge: 'text-expense sm:bg-expense/15',
    button: 'border-expense/30 hover:bg-expense/15',
  },
} as const

function SpendingAlertBanner({ alert }: { alert: SpendingAlert }) {
  const { fmt } = usePrivacyAmount()
  const tone = ALERT_TONES[alert.severity === 'critical' ? 'critical' : 'warning']
  const Icon = tone.icon
  return (
    <div
      role={alert.severity === 'critical' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col gap-2 rounded-[var(--radius-lg)] border px-3.5 py-3 text-[13px] leading-snug sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5 sm:pl-3 sm:pr-2.5 sm:text-sm',
        tone.box
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
        <span
          className={cn(
            'mt-0.5 flex shrink-0 sm:mt-0 sm:h-8 sm:w-8 sm:items-center sm:justify-center sm:rounded-full',
            tone.badge
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <p className="min-w-0">
          <span className="font-medium">{alert.category}</span> is{' '}
          {Math.round(alert.pctAbove * 100)}% above your 3-month average{' '}
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            ({fmt(alert.spent)} vs {fmt(alert.average)})
          </span>
        </p>
      </div>
      <Link
        href={withFromHome('/dashboard/budgets')}
        className={cn(
          'inline-flex shrink-0 items-center gap-1 self-end whitespace-nowrap rounded-full border bg-background/40 px-3.5 py-1.5 text-[13px] font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto',
          tone.button
        )}
      >
        Review budgets
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

export default Dashboard
