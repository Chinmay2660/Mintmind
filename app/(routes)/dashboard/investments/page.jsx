'use client'
import React, { useEffect, useState } from 'react'
import { Plus, TrendingUp, Edit, Trash2, Calendar, DollarSign } from 'lucide-react'
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

const InvestmentsPage = () => {
  const { user } = useAuth()
  const [investments, setInvestments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [formData, setFormData] = useState({
    type: 'FD',
    name: '',
    amount: 0,
    investedDate: new Date().toISOString().split('T')[0],
    maturityDate: '',
    maturityType: 'Ongoing',
    currentValue: '',
    interestRate: '',
    accountId: '',
    notes: '',
  })

  useEffect(() => {
    if (user) {
      fetchInvestments()
      fetchAccounts()
    }
  }, [user, filterType])

  const fetchInvestments = async () => {
    try {
      setLoading(true)
      const params = filterType !== 'all' ? { type: filterType } : {}
      const response = await axios.get('/api/investments', { params })
      setInvestments(response.data)
    } catch (error) {
      toast.error('Failed to load investments')
    } finally {
      setLoading(false)
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
      const payload = {
        ...formData,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : null,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : null,
        accountId: formData.accountId || null,
      }
      if (editingInvestment) {
        await axios.put(`/api/investments/${editingInvestment._id}`, payload)
        toast.success('Investment updated successfully')
      } else {
        await axios.post('/api/investments', payload)
        toast.success('Investment added successfully')
      }
      setIsDialogOpen(false)
      setEditingInvestment(null)
      resetForm()
      fetchInvestments()
    } catch (error) {
      toast.error('Failed to save investment')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this investment?')) return
    try {
      await axios.delete(`/api/investments/${id}`)
      toast.success('Investment deleted successfully')
      fetchInvestments()
    } catch (error) {
      toast.error('Failed to delete investment')
    }
  }

  const handleEdit = (investment) => {
    setEditingInvestment(investment)
    setFormData({
      type: investment.type,
      name: investment.name,
      amount: investment.amount,
      investedDate: format(new Date(investment.investedDate), 'yyyy-MM-dd'),
      maturityDate: investment.maturityDate
        ? format(new Date(investment.maturityDate), 'yyyy-MM-dd')
        : '',
      maturityType: investment.maturityType,
      currentValue: investment.currentValue || '',
      interestRate: investment.interestRate || '',
      accountId: investment.accountId?._id || '',
      notes: investment.notes || '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      type: 'FD',
      name: '',
      amount: 0,
      investedDate: new Date().toISOString().split('T')[0],
      maturityDate: '',
      maturityType: 'Ongoing',
      currentValue: '',
      interestRate: '',
      accountId: '',
      notes: '',
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const totalCurrentValue = investments.reduce(
    (sum, inv) => sum + (inv.currentValue || inv.amount || 0),
    0
  )
  const totalGain = totalCurrentValue - totalInvested

  // Don't show early return - always show header and add button

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Investments"
        subtitle="Track your investment portfolio"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <AddButton
              onClick={() => {
                resetForm()
                setEditingInvestment(null)
              }}
            >
              Add Investment
            </AddButton>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvestment ? 'Edit Investment' : 'Add New Investment'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Investment Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="FD">Fixed Deposit</option>
                  <option value="Mutual Fund">Mutual Fund</option>
                  <option value="Stock">Stock</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., HDFC FD, SBI Mutual Fund"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amount Invested</label>
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
                <label className="text-sm font-medium mb-1 block">Invested Date</label>
                <Input
                  type="date"
                  value={formData.investedDate}
                  onChange={(e) => setFormData({ ...formData, investedDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Maturity Date (Optional)</label>
                <Input
                  type="date"
                  value={formData.maturityDate}
                  onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Maturity Type</label>
                <select
                  value={formData.maturityType}
                  onChange={(e) => setFormData({ ...formData, maturityType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Payout">Payout</option>
                  <option value="Reinvestment">Reinvestment</option>
                  <option value="Maturity">Maturity</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Current Value (Optional)</label>
                <Input
                  type="number"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  step="0.01"
                  placeholder="Current market value"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Interest Rate % (Optional)</label>
                <Input
                  type="number"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  step="0.01"
                  placeholder="Annual interest rate"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Source Account (Optional)</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.icon} {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes (Optional)</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  {editingInvestment ? 'Update' : 'Add'} Investment
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Total Invested</p>
          <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Current Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</p>
        </div>
        <div
          className={`rounded-xl p-5 text-white shadow-lg ${
            totalGain >= 0
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-red-600'
          }`}
        >
          <p className="text-white/80 text-sm mb-1">Total Gain/Loss</p>
          <p className="text-2xl font-bold">
            {totalGain >= 0 ? '+' : ''}
            {formatCurrency(totalGain)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterType('all')}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={filterType === 'FD' ? 'default' : 'outline'}
          onClick={() => setFilterType('FD')}
          size="sm"
        >
          Fixed Deposits
        </Button>
        <Button
          variant={filterType === 'Mutual Fund' ? 'default' : 'outline'}
          onClick={() => setFilterType('Mutual Fund')}
          size="sm"
        >
          Mutual Funds
        </Button>
        <Button
          variant={filterType === 'Stock' ? 'default' : 'outline'}
          onClick={() => setFilterType('Stock')}
          size="sm"
        >
          Stocks
        </Button>
      </div>

      {/* Investments List */}
      <div className="space-y-3">
        {loading ? (
          // Show skeletons while loading
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
            </div>
          ))
        ) : investments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">No investments yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Add your first investment to get started</p>
            <Button
              onClick={() => {
                resetForm()
                setEditingInvestment(null)
                setIsDialogOpen(true)
              }}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Investment
            </Button>
          </motion.div>
        ) : (
          investments.map((investment) => {
            const gain = (investment.currentValue || investment.amount) - investment.amount
            const gainPercent = investment.amount > 0 ? (gain / investment.amount) * 100 : 0

            return (
              <div
                key={investment._id}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {investment.name}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                        {investment.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Invested: {format(new Date(investment.investedDate), 'MMM dd, yyyy')}
                    </p>
                    {investment.maturityDate && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Maturity: {format(new Date(investment.maturityDate), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(investment)}
                      className="text-gray-600 dark:text-gray-400"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(investment._id)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Invested</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(investment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(investment.currentValue || investment.amount)}
                    </p>
                  </div>
                </div>
                {investment.currentValue && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Gain/Loss</span>
                      <span
                        className={`text-sm font-semibold ${
                          gain >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {gain >= 0 ? '+' : ''}
                        {formatCurrency(gain)} ({gainPercent >= 0 ? '+' : ''}
                        {gainPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                )}
                {investment.interestRate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Interest Rate: {investment.interestRate}%
                  </p>
                )}
                {investment.maturityType && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maturity Type: {investment.maturityType}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default InvestmentsPage

