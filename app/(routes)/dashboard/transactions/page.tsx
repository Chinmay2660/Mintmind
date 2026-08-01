'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { Plus, ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Filter } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterButtonGroup } from '@/components/ui/filter-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { ToggleButtonGroup } from '@/components/ui/toggle-button'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useCategories, useBankAccounts } from '@/lib/hooks/useReferenceData'

const TransactionsPageContent = () => {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState([])
  const { categories } = useCategories(user?.id)
  const { accounts } = useBankAccounts(user?.id)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: 0,
    categoryId: '',
    accountId: '',
    isCash: false,
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (user) fetchTransactions()
  }, [user, filterType])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = filterType !== 'all' ? { type: filterType } : {}
      const response = await request.get('/api/transactions', { params })
      setTransactions(response.data)
    } catch (error) {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.categoryId) {
      toast.error('Please select a category')
      return
    }
    
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    
    if (!formData.isCash && !formData.accountId) {
      toast.error('Please select an account')
      return
    }
    
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        accountId: formData.isCash ? null : formData.accountId,
      }
      
      if (editingTransaction) {
        await request.put(`/api/transactions/${editingTransaction._id}`, payload)
        toast.success('Transaction updated successfully')
      } else {
        await request.post('/api/transactions', payload)
        toast.success('Transaction added successfully')
      }
      setIsDialogOpen(false)
      setEditingTransaction(null)
      resetForm()
      fetchTransactions()
    } catch (error) {
      const errorMessage = error.message || 'Failed to save transaction'
      toast.error(errorMessage)
    }
  }

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Transaction',
      description: 'Are you sure you want to delete this transaction?',
      onConfirm: async () => {
        await request.delete(`/api/transactions/${id}`)
        toast.success('Transaction deleted successfully')
        fetchTransactions()
      },
    })
  }

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction)
    setFormData({
      type: transaction.type,
      amount: transaction.amount,
      categoryId: transaction.categoryId?._id || '',
      accountId: transaction.accountId?._id || '',
      isCash: transaction.isCash,
      description: transaction.description || '',
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: 0,
      categoryId: '',
      accountId: '',
      isCash: false,
      description: '',
      date: new Date().toISOString().split('T')[0],
    })
  }

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      const type = searchParams.get('type')
      resetForm()
      if (type === 'income' || type === 'expense') {
        setFormData((prev) => ({ ...prev, type }))
      }
      setEditingTransaction(null)
      setIsDialogOpen(true)
    }
  }, [searchParams])

  const filteredCategories = categories.filter((cat) => cat.type === formData.type)

  const openAddForm = () => {
    resetForm()
    setEditingTransaction(null)
    setIsDialogOpen(true)
  }

  const transactionForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Type</label>
        <select
          value={formData.type}
          onChange={(e) => {
            setFormData({ ...formData, type: e.target.value, categoryId: '' })
          }}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Amount</label>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          required
          step="0.01"
          min="0"
        />
      </div>
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
      <div>
        <label className="text-sm font-medium mb-1 block">Payment Method</label>
        <ToggleButtonGroup
          value={formData.isCash ? 'cash' : 'account'}
          onValueChange={(value) => setFormData({ ...formData, isCash: value === 'cash', accountId: value === 'cash' ? '' : formData.accountId })}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'account', label: 'Bank Account' },
          ]}
        />
      </div>
      {!formData.isCash && (
        <div>
          <label className="text-sm font-medium mb-1 block">Account</label>
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
      <PageHeader
        title="Transactions"
        subtitle="Track your income and expenses"
      >
        <div className="hidden md:block">
          <AddButton onClick={openAddForm}>Add Transaction</AddButton>
        </div>
      </PageHeader>

      <FormSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
      >
        {transactionForm}
      </FormSheet>

      <FAB onClick={openAddForm} label="Add transaction" />

      {/* Filter */}
      <FilterButtonGroup
        value={filterType}
        onValueChange={setFilterType}
        options={[
          { value: 'all', label: 'All' },
          { value: 'income', label: 'Income', icon: ArrowUpCircle },
          { value: 'expense', label: 'Expenses', icon: ArrowDownCircle },
        ]}
        className="overflow-x-auto pb-2 -mx-4 px-4"
      />

      {/* Transactions List - Native Style */}
      <div className="space-y-2">
        {loading ? (
          <ListItemSkeleton count={5} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowDownCircle}
            title="No transactions yet"
            description="Add your first transaction to get started"
            actionLabel="Add Your First Transaction"
            onAction={openAddForm}
          />
        ) : (
          transactions.map((transaction, index) => (
            <SwipeableRow
              key={transaction._id}
              onEdit={() => handleEdit(transaction)}
              onDelete={() => handleDelete(transaction._id)}
            >
              <Card
                delay={0.2 + index * 0.03}
                hover={true}
                className="p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      transaction.type === 'income'
                        ? 'bg-green-100 dark:bg-green-900/20'
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}
                  >
                    {transaction.type === 'income' ? (
                      <ArrowUpCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowDownCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base mb-1 truncate">
                      {transaction.categoryId?.name || 'Uncategorized'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {transaction.description || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')} •{' '}
                      {transaction.isCash
                        ? 'Cash'
                        : transaction.accountId?.accountName || 'Unknown Account'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-lg font-bold ${
                        transaction.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <DesktopRowActions>
                    <EditButton onClick={() => handleEdit(transaction)} />
                    <DeleteButton onClick={() => handleDelete(transaction._id)} />
                  </DesktopRowActions>
                </div>
              </Card>
            </SwipeableRow>
          ))
        )}
      </div>

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

