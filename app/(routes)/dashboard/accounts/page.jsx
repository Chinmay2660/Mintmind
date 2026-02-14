'use client'
import React, { useEffect, useState } from 'react'
import { Wallet, CreditCard, Building2, Banknote, Edit, Trash2, ChevronRight } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { motion } from 'framer-motion'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'

const AccountsPage = () => {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [cash, setCash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [formData, setFormData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    accountType: 'Savings',
    balance: 0,
    color: '#2563eb',
    icon: '🏦',
  })
  const [cashAmount, setCashAmount] = useState(0)

  useEffect(() => {
    if (user) {
      fetchAccounts()
      fetchCash()
    }
  }, [user])

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/bank-accounts')
      setAccounts(response.data)
    } catch (error) {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const fetchCash = async () => {
    try {
      const response = await axios.get('/api/cash')
      setCash(response.data)
    } catch (error) {
      // Error handled silently - cash will remain null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAccount) {
        await axios.put(`/api/bank-accounts/${editingAccount._id}`, formData)
        toast.success('Account updated successfully')
      } else {
        await axios.post('/api/bank-accounts', formData)
        toast.success('Account added successfully')
      }
      setIsDialogOpen(false)
      resetForm()
      fetchAccounts()
    } catch (error) {
      toast.error('Failed to save account')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      await axios.delete(`/api/bank-accounts/${id}`)
      toast.success('Account deleted successfully')
      fetchAccounts()
    } catch (error) {
      toast.error('Failed to delete account')
    }
  }

  const handleEdit = (account) => {
    setEditingAccount(account)
    setFormData({
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber || '',
      accountType: account.accountType,
      balance: account.balance,
      color: account.color,
      icon: account.icon,
    })
    setIsDialogOpen(true)
  }

  const handleCashUpdate = async () => {
    try {
      await axios.put('/api/cash', { amount: parseFloat(cashAmount) })
      toast.success('Cash updated successfully')
      setIsCashDialogOpen(false)
      fetchCash()
    } catch (error) {
      toast.error('Failed to update cash')
    }
  }

  const resetForm = () => {
    setFormData({
      accountName: '',
      bankName: '',
      accountNumber: '',
      accountType: 'Savings',
      balance: 0,
      color: '#2563eb',
      icon: '🏦',
    })
    setEditingAccount(null)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) + (cash?.amount || 0)

  // Don't show early return - always show header and add button

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      {/* Header */}
      <PageHeader
        title="Accounts"
        subtitle="Manage your bank accounts and cash"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <AddButton onClick={() => { resetForm(); setEditingAccount(null) }}>
              Add Account
            </AddButton>
          </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Account Name</label>
                <Input
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                  placeholder="e.g., HDFC Savings"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Bank Name</label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  required
                  placeholder="e.g., HDFC Bank"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Account Number (Optional)</label>
                <Input
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Account number"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Account Type</label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full h-12 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Initial Balance</label>
                <Input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                  required
                  step="0.01"
                  className="h-12"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Icon</label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🏦"
                    className="h-12 text-2xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Color</label>
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-12 w-full"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 h-12 bg-primary hover:bg-primary/90">
                  {editingAccount ? 'Update' : 'Add'} Account
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-12">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Total Balance Card - Native Style */}
      {loading ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white shadow-lg animate-pulse">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="h-4 bg-white/20 rounded w-32 mb-3"></div>
            <div className="h-10 bg-white/20 rounded w-40 mb-4"></div>
            <div className="h-4 bg-white/20 rounded w-40"></div>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <p className="text-white/80 text-sm mb-2 font-medium">Total Balance</p>
            <p className="text-3xl md:text-4xl font-bold">{formatCurrency(totalBalance)}</p>
            <div className="flex items-center gap-2 mt-4 text-sm text-white/80">
              <Banknote className="w-4 h-4" />
              <span>Across all accounts</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cash Card - Native Style */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cash</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(cash?.amount || 0)}
                </p>
              </div>
            </div>
            {!loading && (
              <div suppressHydrationWarning>
                <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Cash</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Amount</label>
                        <Input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                          step="0.01"
                          className="h-12"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={handleCashUpdate} className="flex-1 h-12 bg-primary hover:bg-primary/90">
                          Update
                        </Button>
                        <Button variant="outline" onClick={() => setIsCashDialogOpen(false)} className="h-12">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Bank Accounts List - Native Style */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Accounts</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{loading ? '...' : accounts.length}</span>
        </div>
        {loading ? (
          // Show skeletons while loading
          [1, 2, 3].map((i) => (
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
        ) : accounts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">No accounts yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Add your first account to get started</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account, index) => (
              <motion.div
                key={account._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${account.color}15`, color: account.color }}
                  >
                    {account.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1 truncate">
                      {account.accountName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {account.bankName} • {account.accountType}
                    </p>
                    {account.accountNumber && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        ****{account.accountNumber.slice(-4)}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(account)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(account._id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountsPage
