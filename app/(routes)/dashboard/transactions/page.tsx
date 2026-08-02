'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownCircle, Search } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { useOffline } from '@/contexts/OfflineContext'
import { startOfDay, endOfDay } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { cn } from '@/lib/utils'
import { FAB } from '@/components/ui/fab'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import {
  buildCalendarDays,
  filterByDateRange,
  filterBySearch,
  getDateRangeForView,
  groupByDay,
  summarizeTransactions,
  type TimeView,
  type TransactionLike,
} from '@/lib/utils/transactions'
import { TransactionSummaryBar } from './_components/TransactionSummaryBar'
import { TransactionTimeControls } from './_components/TransactionTimeControls'
import { TransactionCalendarView } from './_components/TransactionCalendarView'
import { TransactionGroupedList } from './_components/TransactionGroupedList'
import {
  TransactionFilterSheet,
  DEFAULT_TRANSACTION_FILTERS,
  applyClientFilters,
  type TransactionFilters,
} from './_components/TransactionFilterSheet'
import { useRegisterRefresh } from '@/contexts/RefreshContext'

const TransactionsPageContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const { online } = useOffline()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<TransactionLike[]>([])
  const { accounts } = useBankAccounts(user?.id)
  const [cashBalance, setCashBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [timeView, setTimeView] = useState<TimeView>('daily')
  const [anchorDate, setAnchorDate] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      const type = searchParams.get('type')
      const url = type
        ? `/dashboard/transactions/new?type=${type}`
        : '/dashboard/transactions/new'
      router.replace(url)
    }
  }, [searchParams, router])

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const range = getDateRangeForView(
        timeView === 'calendar' ? 'monthly' : timeView,
        anchorDate
      )

      const params: Record<string, string> = {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        limit: '1000',
      }
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const [txResponse, cashResponse] = await Promise.all([
        request.get('/api/transactions', { params }),
        request.get('/api/cash'),
      ])
      setTransactions(txResponse.data)
      setCashBalance(cashResponse.data?.amount ?? 0)
    } catch {
      if (!online) {
        toast.message('Showing saved transactions — connect to refresh from server')
      } else {
        toast.error('Failed to load transactions')
      }
    } finally {
      setLoading(false)
    }
  }, [user, timeView, anchorDate, searchQuery, online])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useRegisterRefresh(fetchTransactions)

  useEffect(() => {
    if (!user) return
    request.post('/api/recurring-expenses/process-due').catch(() => {})
  }, [user])

  const filteredTransactions = useMemo(() => {
    let items = [...transactions]

    if (timeView === 'daily') {
      items = filterByDateRange(items, getDateRangeForView('daily', anchorDate))
    } else if (timeView === 'weekly') {
      items = filterByDateRange(items, getDateRangeForView('weekly', anchorDate))
    } else if (timeView === 'yearly') {
      items = filterByDateRange(items, getDateRangeForView('yearly', anchorDate))
    } else if (timeView === 'last3months' || timeView === 'last6months') {
      items = filterByDateRange(items, getDateRangeForView(timeView, anchorDate))
    } else if (timeView === 'calendar' && selectedCalendarDate) {
      const day = new Date(selectedCalendarDate)
      items = filterByDateRange(items, {
        start: startOfDay(day),
        end: endOfDay(day),
      })
    } else if (timeView === 'monthly' || timeView === 'calendar') {
      items = filterByDateRange(items, getDateRangeForView('monthly', anchorDate))
    }

    items = applyClientFilters(items, filters)
    items = filterBySearch(items, searchQuery)
    return items
  }, [transactions, timeView, anchorDate, selectedCalendarDate, filters, searchQuery])

  const summaryTransactions = useMemo(() => {
    if (timeView === 'lifetime') {
      let items = [...transactions]
      items = applyClientFilters(items, filters)
      items = filterBySearch(items, searchQuery)
      return items
    }
    if (timeView === 'calendar' && !selectedCalendarDate) {
      let items = filterByDateRange(transactions, getDateRangeForView('monthly', anchorDate))
      items = applyClientFilters(items, filters)
      items = filterBySearch(items, searchQuery)
      return items
    }
    return filteredTransactions
  }, [
    transactions,
    timeView,
    anchorDate,
    selectedCalendarDate,
    filters,
    searchQuery,
    filteredTransactions,
  ])

  const summary = useMemo(
    () => summarizeTransactions(summaryTransactions),
    [summaryTransactions]
  )
  const dayGroups = useMemo(() => groupByDay(filteredTransactions), [filteredTransactions])
  const calendarDays = useMemo(
    () => buildCalendarDays(anchorDate, transactions),
    [anchorDate, transactions]
  )

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Transaction',
      description: 'Are you sure you want to delete this transaction?',
      onConfirm: async () => {
        await request.delete(`/api/transactions/${id}`)
        toast.success(online ? 'Transaction deleted' : 'Deleted offline — will sync when connected')
        fetchTransactions()
      },
    })
  }

  const isInitialLoad = loading && transactions.length === 0
  const isRefreshing = loading && transactions.length > 0

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <PageHeader title="Transactions" subtitle="Track income, expenses & transfers">
        <div className="hidden md:flex gap-2">
          <TransactionFilterSheet
            filters={filters}
            onFiltersChange={setFilters}
            accounts={accounts as { _id: string; accountName: string; icon?: string; balance?: number }[]}
            cashBalance={cashBalance}
          />
          <AddButton onClick={() => router.push('/dashboard/transactions/new')}>
            Add Transaction
          </AddButton>
        </div>
      </PageHeader>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="pl-9"
          />
        </div>
        <div className="md:hidden">
          <TransactionFilterSheet
            filters={filters}
            onFiltersChange={setFilters}
            accounts={accounts as { _id: string; accountName: string; icon?: string; balance?: number }[]}
            cashBalance={cashBalance}
          />
        </div>
      </div>

      <TransactionTimeControls
        timeView={timeView}
        onTimeViewChange={(view) => {
          setTimeView(view)
          if (view !== 'calendar') setSelectedCalendarDate(null)
        }}
        anchorDate={anchorDate}
        onAnchorDateChange={setAnchorDate}
      />

      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <TransactionSummaryBar summary={summary} loading={isRefreshing} />
        </div>
      </div>

      <FAB onClick={() => router.push('/dashboard/transactions/new')} label="Add transaction" />

      {timeView === 'calendar' && (
        <TransactionCalendarView
          days={calendarDays}
          selectedDateKey={selectedCalendarDate}
          onSelectDate={(key) =>
            setSelectedCalendarDate((prev) => (prev === key ? null : key))
          }
        />
      )}

      {isInitialLoad ? (
        <ListItemSkeleton count={5} />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={ArrowDownCircle}
          title="No transactions found"
          description={
            timeView === 'calendar' && !selectedCalendarDate
              ? 'Select a day on the calendar to view transactions'
              : 'Add your first transaction to get started'
          }
          actionLabel="Add Transaction"
          onAction={() => router.push('/dashboard/transactions/new')}
        />
      ) : (
        <div className={cn('transition-opacity', isRefreshing && 'opacity-60 pointer-events-none')}>
          <TransactionGroupedList
            groups={dayGroups}
            onEdit={(tx) => router.push(`/dashboard/transactions/${tx._id}`)}
            onDelete={handleDelete}
          />
        </div>
      )}

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsPageContent />
    </Suspense>
  )
}
