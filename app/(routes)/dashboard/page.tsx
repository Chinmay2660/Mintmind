'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import React, { useCallback, useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import Link from 'next/link'
import { ActivityChart } from './_components/ActivityChart'
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
import { DEFAULT_CATEGORY_COLOR } from '@/lib/constants/colors'
import { cn } from '@/lib/utils'

interface Transaction {
  _id?: string
  id?: string
  type?: string
  amount?: number
  description?: string
  date?: string
  categoryId?: { name?: string; icon?: string; color?: string }
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id
  const [stats, setStats] = useState<DashboardStats>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeCategories, setIncomeCategories] = useState<CategoryStat[]>([])
  const [expenseCategories, setExpenseCategories] = useState<CategoryStat[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const [statsData, txRes, categoryStats] = await Promise.all([
      fetchDashboardStats(),
      request.get('/api/transactions'),
      fetchTransactionStats({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
        types: 'income,expense',
      }),
    ])

    setStats(statsData || {})
    setTransactions(Array.isArray(txRes.data) ? txRes.data : [])
    setIncomeCategories(categoryStats?.incomeCategoryWise ?? [])
    setExpenseCategories(categoryStats?.categoryWise ?? [])
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
  const recentTransactions = transactions.slice(0, 5)
  const { fmt: fmtAmount } = usePrivacyAmount()

  return (
    <>
      <DashboardHero
        displayName={displayName}
        authLoading={authLoading}
        loading={loading}
        stats={stats}
      />

      <DashboardQuickActions className="md:hidden" />

      <section>
        <SectionHeader title="Overview" subtitle="Tap a card for details" />
        <div className="mm-grid-metrics">
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
                  isCount: metric.isCount,
                  isPercent: metric.isPercent,
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

      <div className="mm-grid-dashboard">
        <ChartCard
          title="Weekly spending"
          subtitle="Last 7 days"
          loading={loading}
          className="lg:col-span-8"
          contentClassName="min-h-[11rem]"
        >
          <ActivityChart transactions={transactions} />
        </ChartCard>

        <div className="surface-card flex flex-col justify-between p-5 md:p-6 lg:col-span-4">
          <div>
            <p className="mm-stat-label">This month</p>
            <div className="mt-4 space-y-4">
              <MonthRow
                icon={ArrowUpCircle}
                label="Income"
                value={loading ? '—' : fmtAmount(stats.monthlyIncome ?? 0)}
                tone="text-income"
              />
              <MonthRow
                icon={ArrowDownCircle}
                label="Expenses"
                value={loading ? '—' : fmtAmount(stats.monthlyExpenses ?? 0)}
                tone="text-expense"
              />
            </div>
          </div>
          <Link
            href={withFromHome('/dashboard/budgets')}
            className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            Manage budgets →
          </Link>
        </div>
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
          title="Recent activity"
          action={<ViewAllLink href={withFromHome('/dashboard/transactions')} label="All" />}
        />

        <div className="surface-card divide-y divide-border/60 overflow-hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton m-3 h-14 rounded-xl" />
            ))
          ) : recentTransactions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No transactions yet. Log your first expense or income to get started.
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const catColor = tx.categoryId?.color || DEFAULT_CATEGORY_COLOR
              const catIcon = tx.categoryId?.icon
              const catName = tx.categoryId?.name
              const isIncome = tx.type === 'income'
              const isTransfer = tx.type === 'transfer'

              return (
                <Link
                  key={tx._id || tx.id}
                  href={withFromHome('/dashboard/transactions')}
                  className="mm-list-row rounded-none border-0 px-4 py-3.5 md:px-5"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
                    style={{
                      backgroundColor: `${isTransfer ? 'hsl(var(--warning))' : catColor}18`,
                    }}
                  >
                    {isTransfer ? '↔' : catIcon || (isIncome ? '💰' : '📁')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {tx.description || (isTransfer ? 'Transfer' : catName) || 'Transaction'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'shrink-0 text-sm font-semibold tabular-nums',
                      isIncome ? 'text-income' : isTransfer ? 'text-warning' : 'text-foreground'
                    )}
                  >
                    {isIncome ? '+' : isTransfer ? '↔' : '−'}
                    {fmtAmount(tx.amount || 0)}
                  </p>
                </Link>
              )
            })
          )}
        </div>
      </section>
    </>
  )
}

function MonthRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Icon className={cn('h-4 w-4', tone)} strokeWidth={1.75} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export default Dashboard
