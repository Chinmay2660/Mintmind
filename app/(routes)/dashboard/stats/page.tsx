'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  TransactionFilterSheet,
  DEFAULT_TRANSACTION_FILTERS,
  applyClientFilters,
  type TransactionFilters,
} from '../transactions/_components/TransactionFilterSheet'
import { TransactionSummaryBar } from '../transactions/_components/TransactionSummaryBar'
import { TransactionGroupedList } from '../transactions/_components/TransactionGroupedList'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import {
  filterByDateRange,
  groupByDay,
  summarizeTransactions,
  type TransactionLike,
} from '@/lib/utils/transactions'
import { formatDayMonthYear, formatDayMonthYearLong } from '@/lib/utils/format'
import { useRegisterRefresh } from '@/contexts/RefreshContext'

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
  const { accounts } = useBankAccounts(user?.id)
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

  useEffect(() => {
    if (user) fetchStats()
  }, [user, dayRange, filters])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {
        startDate: dayRange.start.toISOString(),
        endDate: dayRange.end.toISOString(),
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
      toast.error('Failed to load daily statistics')
    } finally {
      setLoading(false)
    }
  }

  useRegisterRefresh(fetchStats)

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
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4 overflow-x-hidden">
      <PageHeader title="Daily Stats" subtitle="Day wise transaction breakdown">
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
          onClick={() => setAnchorDate((d) => subDays(d, 1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-base font-semibold text-foreground">{formatDayMonthYear(anchorDate)}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setAnchorDate((d) => addDays(d, 1))}
          aria-label="Next day"
          disabled={startOfDay(anchorDate) >= startOfDay(new Date())}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <TransactionSummaryBar summary={summary} loading={isRefreshing} />

      <div className={cn('space-y-3 transition-opacity', isRefreshing && 'opacity-60')}>
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No transactions"
            description={`No transactions found for ${formatDayMonthYearLong(anchorDate)}`}
          />
        ) : (
          <TransactionGroupedList groups={dayGroups} />
        )}
      </div>
    </div>
  )
}

export default DailyStatsPage
