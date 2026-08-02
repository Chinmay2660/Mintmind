'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import {
  TransactionFilterSheet,
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionFilters,
} from '../../transactions/_components/TransactionFilterSheet'
import { CategoryBreakdownCard, type CategoryStat } from '../_components/CategoryBreakdownCard'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'

interface StatsData {
  summary: {
    income: number
    expense: number
    net: number
  }
  categoryWise: CategoryStat[]
  incomeCategoryWise: CategoryStat[]
  cashBalance: number
}

const CategoryStatsPage = () => {
  const { user } = useAuth()
  const { accounts } = useBankAccounts(user?.id)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [anchorDate, setAnchorDate] = useState(new Date())
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS)
  const [loading, setLoading] = useState(true)

  const monthRange = useMemo(
    () => ({
      start: startOfMonth(anchorDate),
      end: endOfMonth(anchorDate),
    }),
    [anchorDate]
  )

  useEffect(() => {
    if (user) fetchStats()
  }, [user, monthRange, filters])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {
        startDate: monthRange.start.toISOString(),
        endDate: monthRange.end.toISOString(),
      }

      const types: string[] = []
      if (filters.types.income) types.push('income')
      if (filters.types.expense) types.push('expense')
      if (filters.types.transferIn || filters.types.transferOut) types.push('transfer')
      if (types.length) params.types = types.join(',')

      if (filters.accountIds.length) params.accountIds = filters.accountIds.join(',')
      if (filters.includeCash) params.includeCash = 'true'

      const response = await request.get('/api/dashboard/transaction-stats', { params })
      setStats(response.data)
    } catch {
      toast.error('Failed to load category statistics')
    } finally {
      setLoading(false)
    }
  }

  const isInitialLoad = loading && !stats
  const isRefreshing = loading && !!stats
  const showIncomeChart = filters.types.income
  const showExpenseChart = filters.types.expense
  const hasCategoryCharts = showIncomeChart || showExpenseChart

  if (isInitialLoad) return <PageSkeleton className="pb-24 md:pb-6" />

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4 overflow-x-hidden">
      <PageHeader title="Category Stats" subtitle={format(anchorDate, 'MMMM yyyy')}>
        <TransactionFilterSheet
          filters={filters}
          onFiltersChange={setFilters}
          accounts={accounts as { _id: string; accountName: string; icon?: string; balance?: number }[]}
          cashBalance={stats?.cashBalance ?? 0}
        />
      </PageHeader>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setAnchorDate((d) => subMonths(d, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-base font-semibold text-foreground">{format(anchorDate, 'yyyy MMM')}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setAnchorDate((d) => addMonths(d, 1))}
          aria-label="Next month"
          disabled={anchorDate >= startOfMonth(new Date())}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {hasCategoryCharts ? (
        <div
          className={cn(
            'grid gap-6 transition-opacity',
            showIncomeChart && showExpenseChart ? 'md:grid-cols-2' : 'grid-cols-1',
            isRefreshing && 'opacity-60'
          )}
        >
          {showIncomeChart && (
            <CategoryBreakdownCard
              title="Income by Category"
              categories={stats?.incomeCategoryWise ?? []}
              total={stats?.summary.income ?? 0}
              loading={isRefreshing}
            />
          )}
          {showExpenseChart && (
            <CategoryBreakdownCard
              title="Expenses by Category"
              categories={stats?.categoryWise ?? []}
              total={stats?.summary.expense ?? 0}
              loading={isRefreshing}
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          Enable income or expense filters to view category breakdown.
        </p>
      )}
    </div>
  )
}

export default CategoryStatsPage
