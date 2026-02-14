'use client'
/**
 * REFACTORED VERSION - Shows proper modular structure
 * 
 * This demonstrates:
 * - Using custom hooks for data fetching
 * - Using services instead of direct API calls
 * - Using utility functions for formatting
 * - Using constants instead of magic strings
 */
import React, { useState } from 'react'
import { Plus, Wallet, Banknote, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@clerk/nextjs'

// ✅ Import custom hooks
import { useBankAccounts } from '@/lib/hooks/useBankAccounts'
import { useCash } from '@/lib/hooks/useCash'

// ✅ Import utilities
import { formatCurrency } from '@/lib/utils/format'

// ✅ Import constants
import { ACCOUNT_TYPES, DEFAULT_ICONS } from '@/lib/constants'

const AccountsPage = () => {
  const { user } = useUser()
  
  // ✅ Use custom hooks instead of manual state management
  const {
    accounts,
    loading: accountsLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useBankAccounts()

  const {
    cash,
    loading: cashLoading,
    updateCash,
  } = useCash()

  // Local UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [formData, setFormData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    accountType: ACCOUNT_TYPES.SAVINGS,
    balance: 0,
    color: '#4845d2',
    icon: DEFAULT_ICONS.ACCOUNT,
  })
  const [cashAmount, setCashAmount] = useState(0)

  // ✅ Handlers use hook methods
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAccount) {
        await updateAccount(editingAccount._id, formData)
      } else {
        await createAccount(formData)
      }
      setIsDialogOpen(false)
      setEditingAccount(null)
      resetForm()
    } catch (error) {
      // Error already handled in hook
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      await deleteAccount(id)
    } catch (error) {
      // Error already handled in hook
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
      await updateCash(parseFloat(cashAmount))
      setIsCashDialogOpen(false)
    } catch (error) {
      // Error already handled in hook
    }
  }

  const resetForm = () => {
    setFormData({
      accountName: '',
      bankName: '',
      accountNumber: '',
      accountType: ACCOUNT_TYPES.SAVINGS,
      balance: 0,
      color: '#4845d2',
      icon: DEFAULT_ICONS.ACCOUNT,
    })
  }

  const loading = accountsLoading || cashLoading
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) + (cash?.amount || 0)

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
            Manage your bank accounts and cash
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingAccount(null) }} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Account Name</label>
                <Input
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                  placeholder="e.g., HDFC Savings"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Bank Name</label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  required
                  placeholder="e.g., HDFC Bank"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Account Type</label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.values(ACCOUNT_TYPES).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Initial Balance</label>
                <Input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                  required
                  step="0.01"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  {editingAccount ? 'Update' : 'Add'} Account
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm mb-1">Total Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
          </div>
          <Banknote className="w-12 h-12 opacity-80" />
        </div>
      </div>

      {/* Cash Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg">
              <Banknote className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cash</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(cash?.amount || 0)}
              </p>
            </div>
          </div>
          <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setCashAmount(cash?.amount || 0)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Cash</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount</label>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCashUpdate} className="flex-1 bg-primary hover:bg-primary/90">
                    Update
                  </Button>
                  <Button variant="outline" onClick={() => setIsCashDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bank Accounts List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Accounts</h2>
        {accounts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No accounts yet. Add your first account!</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account._id}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${account.color}20`, color: account.color }}
                  >
                    <span className="text-2xl">{account.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {account.accountName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {account.bankName} • {account.accountType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(account)}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(account._id)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AccountsPage

