'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useOffline } from '@/contexts/OfflineContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  TransactionFilterSheet,
  DEFAULT_TRANSACTION_FILTERS,
  applyClientFilters,
  buildTypesParam,
  type TransactionFilters,
} from '../transactions/_components/TransactionFilterSheet'
import { TransactionSummaryBar } from '../transactions/_components/TransactionSummaryBar'
import { TransactionGroupedList } from '../transactions/_components/TransactionGroupedList'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { computeTransactionStats } from '@/lib/offline/computed'
import {
  filterByDateRange,
  groupByDay,
  summarizeTransactions,
  type TransactionLike,
} from '@/lib/utils/transactions'
import { formatDayMonthYear, formatDayMonthYearLong } from '@/lib/utils/format'

interface StatsData {
  summary: {
    income: number
    expense: number
    net: number
    transferIn: number
    transferOut: number
    transactionCount: number
  }
  cashBalance: number
  transactions?: TransactionLike[]
}

const DailyStatsPage = () => {
  const { user } = useAuth()
  const userId = user?.id
  const { syncing, lastSyncedAt } = useOffline()
  const { accounts } = useBankAccounts(userId)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [anchorDate, setAnchorDate] = useState(new Date())
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS)
  const [loading, setLoading] = useState(true)

  const dayRange = useMemo(
    () => ({
      start: startOfDay(anchorDate),
      end: endOfDay(anchorDate),
    }),
    [anchorDate]
  )

  const loadStats = useCallback(async () => {
    const types = buildTypesParam(filters)
    const result = await computeTransactionStats({
      startDate: dayRange.start.toISOString(),
      endDate: dayRange.end.toISOString(),
      types,
    })
    setStats(result as StatsData)
  }, [dayRange, filters])

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
        if (!cancelled) toast.error('Failed to load daily statistics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, syncing, lastSyncedAt, loadStats])

  useSyncedRefresh(loadStats)

  const filteredTransactions = useMemo(() => {
    if (!stats?.transactions) return []
    let items = filterByDateRange(stats.transactions, dayRange)
    return applyClientFilters(items, filters)
  }, [stats?.transactions, dayRange, filters])

  const summary = useMemo(() => summarizeTransactions(filteredTransactions), [filteredTransactions])
  const dayGroups = useMemo(() => groupByDay(filteredTransactions), [filteredTransactions])

  const isInitialLoad = loading && !stats
  const isRefreshing = loading && !!stats

  if (isInitialLoad) return <PageSkeleton className="pb-24 md:pb-6" />

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <PageHeader title="Daily Stats" subtitle={formatDayMonthYearLong(anchorDate)}>
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
          onClick={() => setAnchorDate((d) => subDays(d, 1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">{formatDayMonthYear(anchorDate)}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnchorDate((d) => addDays(d, 1))}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <TransactionSummaryBar summary={summary} loading={isRefreshing} />

      {filteredTransactions.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No transactions" description="Nothing recorded for this day" />
      ) : (
        <div className={cn('transition-opacity', isRefreshing && 'opacity-60 pointer-events-none')}>
          <TransactionGroupedList groups={dayGroups} />
        </div>
      )}
    </div>
  )
}

export default DailyStatsPage
