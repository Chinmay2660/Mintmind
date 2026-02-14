'use client'
import React, { useEffect, useState } from 'react'
import { Plus, ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Filter } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterButtonGroup } from '@/components/ui/filter-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { ToggleButtonGroup } from '@/components/ui/toggle-button'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'

const TransactionsPage = () => {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [filterType, setFilterType] = useState('all')
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
    if (user) {
      fetchTransactions()
      fetchCategories()
      fetchAccounts()
    }
  }, [user, filterType])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = filterType !== 'all' ? { type: filterType } : {}
      const response = await axios.get('/api/transactions', { params })
      setTransactions(response.data)
    } catch (error) {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const [expenseCats, incomeCats] = await Promise.all([
        axios.get('/api/categories?type=expense'),
        axios.get('/api/categories?type=income'),
      ])
      setCategories([...expenseCats.data, ...incomeCats.data])
    } catch (error) {
      // Error handled silently
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/bank-accounts')
      setAccounts(response.data)
    } catch (error) {
      // Error handled silently
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTransaction) {
        await axios.put(`/api/transactions/${editingTransaction._id}`, formData)
        toast.success('Transaction updated successfully')
      } else {
        await axios.post('/api/transactions', formData)
        toast.success('Transaction added successfully')
      }
      setIsDialogOpen(false)
      setEditingTransaction(null)
      resetForm()
      fetchTransactions()
    } catch (error) {
      toast.error('Failed to save transaction')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return
    try {
      await axios.delete(`/api/transactions/${id}`)
      toast.success('Transaction deleted successfully')
      fetchTransactions()
    } catch (error) {
      toast.error('Failed to delete transaction')
    }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const filteredCategories = categories.filter((cat) => cat.type === formData.type)

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <PageHeader
        title="Transactions"
        subtitle="Track your income and expenses"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <AddButton
              onClick={() => {
                resetForm()
                setEditingTransaction(null)
              }}
            >
              Add Transaction
            </AddButton>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </DialogTitle>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
      </PageHeader>

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
          // Show skeletons while loading
          [1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            </div>
          ))
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowDownCircle}
            title="No transactions yet"
            description="Add your first transaction to get started"
            actionLabel="Add Your First Transaction"
            onAction={() => {
              resetForm()
              setEditingTransaction(null)
              setIsDialogOpen(true)
            }}
          />
        ) : (
          transactions.map((transaction, index) => (
            <Card
              key={transaction._id}
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
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1 truncate">
                    {transaction.categoryId?.name || 'Uncategorized'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {transaction.description || 'No description'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                <div className="flex gap-1">
                  <EditButton onClick={() => handleEdit(transaction)} />
                  <DeleteButton onClick={() => handleDelete(transaction._id)} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default TransactionsPage

