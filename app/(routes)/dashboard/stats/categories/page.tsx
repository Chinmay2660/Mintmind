'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useOffline } from '@/contexts/OfflineContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import {
  TransactionFilterSheet,
  DEFAULT_TRANSACTION_FILTERS,
  buildTypesParam,
  type TransactionFilters,
} from '../../transactions/_components/TransactionFilterSheet'
import { CategoryBreakdownCard, type CategoryStat } from '../_components/CategoryBreakdownCard'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { computeTransactionStats } from '@/lib/offline/computed'

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
  const userId = user?.id
  const { syncing, lastSyncedAt } = useOffline()
  const { accounts } = useBankAccounts(userId)
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

  const loadStats = useCallback(async () => {
    const types = buildTypesParam(filters)
    const result = await computeTransactionStats({
      startDate: monthRange.start.toISOString(),
      endDate: monthRange.end.toISOString(),
      types,
    })
    setStats(result as StatsData)
  }, [monthRange, filters])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    if (syncing) return

    let cancelled = false
    setLoading(true)
    loadStats()
      .catch(() => {
        if (!cancelled) toast.error('Failed to load category statistics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, syncing, lastSyncedAt, loadStats])

  useSyncedRefresh(loadStats)

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

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnchorDate((d) => subMonths(d, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{format(anchorDate, 'MMMM yyyy')}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnchorDate((d) => addMonths(d, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className={cn('grid gap-4', hasCategoryCharts ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
        {showIncomeChart && (
          <CategoryBreakdownCard
            title="Income by category"
            categories={stats?.incomeCategoryWise ?? []}
            total={stats?.summary?.income ?? 0}
            loading={isRefreshing}
          />
        )}
        {showExpenseChart && (
          <CategoryBreakdownCard
            title="Expenses by category"
            categories={stats?.categoryWise ?? []}
            total={stats?.summary?.expense ?? 0}
            loading={isRefreshing}
          />
        )}
      </div>
    </div>
  )
}

export default CategoryStatsPage
