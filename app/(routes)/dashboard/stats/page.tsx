'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
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
import { groupByDay, type TransactionLike } from '@/lib/utils/transactions'

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
      toast.error('Failed to load daily statistics')
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = useMemo(() => {
    if (!stats?.transactions) return []
    return applyClientFilters(stats.transactions, filters)
  }, [stats?.transactions, filters])

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

      {stats?.summary && (
        <TransactionSummaryBar
          summary={{
            income: stats.summary.income,
            expense: stats.summary.expense,
            net: stats.summary.net,
            transferIn: stats.summary.transferIn,
            transferOut: stats.summary.transferOut,
          }}
          loading={isRefreshing}
        />
      )}

      <div className={cn('space-y-3 transition-opacity', isRefreshing && 'opacity-60')}>
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No transactions"
            description={`No transactions found for ${format(anchorDate, 'MMMM yyyy')}`}
          />
        ) : (
          <TransactionGroupedList groups={dayGroups} />
        )}
      </div>
    </div>
  )
}

export default DailyStatsPage
