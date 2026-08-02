'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownCircle, Search } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { useOffline } from '@/contexts/OfflineContext'
import { format, startOfDay, endOfDay } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { ToggleButtonGroup } from '@/components/ui/toggle-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { cn } from '@/lib/utils'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useCategories, useBankAccounts } from '@/lib/hooks/useReferenceData'
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

interface FormData {
  type: 'expense' | 'income' | 'transfer'
  amount: number
  categoryId: string
  accountId: string
  isCash: boolean
  transferToAccountId: string
  transferToIsCash: boolean
  description: string
  date: string
}

const EMPTY_FORM: FormData = {
  type: 'expense',
  amount: 0,
  categoryId: '',
  accountId: '',
  isCash: false,
  transferToAccountId: '',
  transferToIsCash: false,
  description: '',
  date: new Date().toISOString().split('T')[0],
}

const TransactionsPageContent = () => {
  const { user } = useAuth()
  const { online } = useOffline()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<TransactionLike[]>([])
  const { categories } = useCategories(user?.id)
  const { accounts } = useBankAccounts(user?.id)
  const [cashBalance, setCashBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionLike | null>(null)
  const [timeView, setTimeView] = useState<TimeView>('monthly')
  const [anchorDate, setAnchorDate] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const range =
        timeView === 'total'
          ? { start: new Date(2000, 0, 1), end: new Date() }
          : getDateRangeForView(timeView === 'calendar' ? 'monthly' : timeView, anchorDate)

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

  // ponytail: process due recurring on transactions page load
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
    } else if (timeView === 'calendar' && selectedCalendarDate) {
      const day = new Date(selectedCalendarDate)
      items = filterByDateRange(items, {
        start: startOfDay(day),
        end: endOfDay(day),
      })
    }

    items = applyClientFilters(items, filters)
    items = filterBySearch(items, searchQuery)
    return items
  }, [transactions, timeView, anchorDate, selectedCalendarDate, filters, searchQuery])

  const summary = useMemo(() => summarizeTransactions(filteredTransactions), [filteredTransactions])
  const dayGroups = useMemo(() => groupByDay(filteredTransactions), [filteredTransactions])
  const calendarDays = useMemo(
    () => buildCalendarDays(anchorDate, transactions),
    [anchorDate, transactions]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.type !== 'transfer' && !formData.categoryId) {
      toast.error('Please select a category')
      return
    }
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    if (formData.type === 'transfer') {
      const hasFrom = formData.isCash || formData.accountId
      const hasTo = formData.transferToIsCash || formData.transferToAccountId
      if (!hasFrom || !hasTo) {
        toast.error('Please select both source and destination')
        return
      }
    } else if (!formData.isCash && !formData.accountId) {
      toast.error('Please select an account')
      return
    }

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        accountId: formData.isCash ? null : formData.accountId,
        transferToAccountId: formData.transferToIsCash ? null : formData.transferToAccountId,
        categoryId: formData.type === 'transfer' ? undefined : formData.categoryId,
      }

      if (editingTransaction) {
        await request.put(`/api/transactions/${editingTransaction._id}`, payload)
        toast.success(online ? 'Transaction updated' : 'Updated offline — will sync when connected')
      } else {
        await request.post('/api/transactions', payload)
        toast.success(online ? 'Transaction added' : 'Saved offline — will sync when connected')
      }
      setIsDialogOpen(false)
      setEditingTransaction(null)
      setFormData(EMPTY_FORM)
      fetchTransactions()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save transaction'
      toast.error(message)
    }
  }

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

  const handleEdit = (transaction: TransactionLike) => {
    setEditingTransaction(transaction)
    setFormData({
      type: transaction.type as FormData['type'],
      amount: transaction.amount,
      categoryId: transaction.categoryId?._id || '',
      accountId:
        typeof transaction.accountId === 'object' ? transaction.accountId?._id || '' : '',
      isCash: transaction.isCash ?? false,
      transferToAccountId:
        typeof transaction.transferToAccountId === 'object'
          ? transaction.transferToAccountId?._id || ''
          : '',
      transferToIsCash: transaction.transferToIsCash ?? false,
      description: transaction.description || '',
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
    })
    setIsDialogOpen(true)
  }

  const openAddForm = () => {
    setFormData(EMPTY_FORM)
    setEditingTransaction(null)
    setIsDialogOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      const type = searchParams.get('type')
      setFormData({
        ...EMPTY_FORM,
        type: type === 'income' || type === 'expense' || type === 'transfer' ? type : 'expense',
      })
      setEditingTransaction(null)
      setIsDialogOpen(true)
    }
  }, [searchParams])

  const filteredCategories = categories.filter((cat) =>
    formData.type === 'transfer' ? true : cat.type === formData.type
  )

  const isInitialLoad = loading && transactions.length === 0
  const isRefreshing = loading && transactions.length > 0

  const transactionForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Type</label>
        <ToggleButtonGroup
          value={formData.type}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              type: value as FormData['type'],
              categoryId: '',
            })
          }
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
            { value: 'transfer', label: 'Transfer' },
          ]}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Amount</label>
        <Input
          type="number"
          value={formData.amount || ''}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          required
          step="0.01"
          min="0"
        />
      </div>
      {formData.type !== 'transfer' && (
        <div>
          <label className="text-sm font-medium mb-1 block">Category</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select category</option>
            {filteredCategories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-sm font-medium mb-1 block">
          {formData.type === 'transfer' ? 'From' : 'Payment Method'}
        </label>
        <ToggleButtonGroup
          value={formData.isCash ? 'cash' : 'account'}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              isCash: value === 'cash',
              accountId: value === 'cash' ? '' : formData.accountId,
            })
          }
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'account', label: 'Bank Account' },
          ]}
        />
      </div>
      {!formData.isCash && (
        <div>
          <label className="text-sm font-medium mb-1 block">
            {formData.type === 'transfer' ? 'From Account' : 'Account'}
          </label>
          <select
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required={!formData.isCash}
          >
            <option value="">Select account</option>
            {accounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.icon} {acc.accountName}
              </option>
            ))}
          </select>
        </div>
      )}
      {formData.type === 'transfer' && (
        <>
          <div>
            <label className="text-sm font-medium mb-1 block">To</label>
            <ToggleButtonGroup
              value={formData.transferToIsCash ? 'cash' : 'account'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  transferToIsCash: value === 'cash',
                  transferToAccountId: value === 'cash' ? '' : formData.transferToAccountId,
                })
              }
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'account', label: 'Bank Account' },
              ]}
            />
          </div>
          {!formData.transferToIsCash && (
            <div>
              <label className="text-sm font-medium mb-1 block">To Account</label>
              <select
                value={formData.transferToAccountId}
                onChange={(e) =>
                  setFormData({ ...formData, transferToAccountId: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required={!formData.transferToIsCash}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.icon} {acc.accountName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Date</label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>
      <FormButtonGroup
        submitLabel={editingTransaction ? 'Update Transaction' : 'Add Transaction'}
        onCancel={() => setIsDialogOpen(false)}
      />
    </form>
  )

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
          <AddButton onClick={openAddForm}>Add Transaction</AddButton>
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

      <FormSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
      >
        {transactionForm}
      </FormSheet>

      <FAB onClick={openAddForm} label="Add transaction" />

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
          onAction={openAddForm}
        />
      ) : (
        <div className={cn('transition-opacity', isRefreshing && 'opacity-60 pointer-events-none')}>
          <TransactionGroupedList
            groups={dayGroups}
            onEdit={handleEdit}
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
