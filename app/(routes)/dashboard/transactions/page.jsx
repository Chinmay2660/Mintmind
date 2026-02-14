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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.isCash ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, isCash: true, accountId: '' })}
                    className="flex-1"
                  >
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.isCash ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, isCash: false })}
                    className="flex-1"
                  >
                    Bank Account
                  </Button>
                </div>
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
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  {editingTransaction ? 'Update' : 'Add'} Transaction
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filter - Native Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4"
      >
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterType('all')}
          size="sm"
          className="rounded-full whitespace-nowrap"
        >
          All
        </Button>
        <Button
          variant={filterType === 'income' ? 'default' : 'outline'}
          onClick={() => setFilterType('income')}
          size="sm"
          className="rounded-full whitespace-nowrap"
        >
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Income
        </Button>
        <Button
          variant={filterType === 'expense' ? 'default' : 'outline'}
          onClick={() => setFilterType('expense')}
          size="sm"
          className="rounded-full whitespace-nowrap"
        >
          <ArrowDownCircle className="w-4 h-4 mr-2" />
          Expenses
        </Button>
      </motion.div>

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ArrowDownCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">No transactions yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Add your first transaction to get started</p>
            <Button
              onClick={() => {
                resetForm()
                setEditingTransaction(null)
                setIsDialogOpen(true)
              }}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Transaction
            </Button>
          </motion.div>
        ) : (
          transactions.map((transaction, index) => (
            <motion.div
              key={transaction._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.03 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-transform"
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
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(transaction)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  >
                    <Edit className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(transaction._id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default TransactionsPage

