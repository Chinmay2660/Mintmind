'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { Wallet, Banknote, Edit } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { SubmitButton, CancelButton } from '@/components/ui/form-buttons'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useRegisterRefresh } from '@/contexts/RefreshContext'

const AccountsPageContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [cash, setCash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false)
  const [cashAmount, setCashAmount] = useState(0)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      router.replace('/dashboard/accounts/new')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (user) {
      fetchAccounts()
      fetchCash()
    }
  }, [user])

  const fetchAccounts = async () => {
    try {
      const response = await request.get('/api/bank-accounts')
      setAccounts(response.data)
    } catch (error) {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const fetchCash = async () => {
    try {
      const response = await request.get('/api/cash')
      setCash(response.data)
    } catch (error) {
      // Error handled silently - cash will remain null
    }
  }

  useRegisterRefresh(async () => {
    await Promise.all([fetchAccounts(), fetchCash()])
  })

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Account',
      description: 'Are you sure you want to delete this account?',
      onConfirm: async () => {
        await request.delete(`/api/bank-accounts/${id}`)
        toast.success('Account deleted successfully')
        fetchAccounts()
      },
    })
  }

  const handleCashUpdate = async () => {
    try {
      await request.put('/api/cash', { amount: cashAmount })
      toast.success('Cash updated successfully')
      setIsCashDialogOpen(false)
      fetchCash()
    } catch (error) {
      toast.error('Failed to update cash')
    }
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) + (cash?.amount || 0)

  const cashForm = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Amount</label>
        <Input
          type="number"
          value={cashAmount}
          onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
          step="0.01"
          className="h-12"
        />
      </div>
      <div className="flex gap-3">
        <SubmitButton onClick={handleCashUpdate} type="button" className="h-12">
          Update
        </SubmitButton>
        <CancelButton onClick={() => setIsCashDialogOpen(false)} className="h-12">
          Cancel
        </CancelButton>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <PageHeader title="Accounts" subtitle="Manage your bank accounts and cash">
        <div className="hidden md:block">
          <AddButton onClick={() => router.push('/dashboard/accounts/new')}>Add Account</AddButton>
        </div>
      </PageHeader>

      <FormSheet open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen} title="Update Cash">
        {cashForm}
      </FormSheet>

      <FAB onClick={() => router.push('/dashboard/accounts/new')} label="Add account" />

      {loading ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white shadow-lg animate-pulse">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="h-4 bg-white/20 rounded-md w-32 mb-3"></div>
            <div className="h-10 bg-white/20 rounded-md w-40 mb-4"></div>
            <div className="h-4 bg-white/20 rounded-md w-40"></div>
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

      {loading ? (
        <div className="surface-card p-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="skeleton-icon w-12 h-12"></div>
              <div className="flex-1">
                <div className="skeleton h-4 w-16 mb-2"></div>
                <div className="skeleton h-8 w-32"></div>
              </div>
            </div>
            <div className="skeleton w-10 h-10 rounded-full"></div>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="surface-card p-5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Cash</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(cash?.amount || 0)}
                </p>
              </div>
            </div>
            {!loading && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setCashAmount(cash?.amount || 0)
                  setIsCashDialogOpen(true)
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold text-foreground">Bank Accounts</h2>
          <span className="text-sm text-muted-foreground">{loading ? '...' : accounts.length}</span>
        </div>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="skeleton-icon w-12 h-12"></div>
                <div className="flex-1">
                  <div className="skeleton h-4 w-32 mb-2"></div>
                  <div className="skeleton h-3 w-24"></div>
                </div>
                <div className="skeleton h-6 w-20"></div>
              </div>
            </div>
          ))
        ) : accounts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 surface-card"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2 font-medium">No accounts yet</p>
            <p className="text-sm text-muted-foreground">Add your first account to get started</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account, index) => (
              <SwipeableRow
                key={account._id}
                onEdit={() => router.push(`/dashboard/accounts/${account._id}`)}
                onDelete={() => handleDelete(account._id)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="surface-card p-4 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${account.color}15`, color: account.color }}
                    >
                      {account.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-base mb-1 truncate">
                        {account.accountName}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {account.bankName} • {account.accountType}
                      </p>
                      {account.accountNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ****{account.accountNumber.slice(-4)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                    <DesktopRowActions>
                      <EditButton
                        onClick={() => router.push(`/dashboard/accounts/${account._id}`)}
                      />
                      <DeleteButton onClick={() => handleDelete(account._id)} />
                    </DesktopRowActions>
                  </div>
                </motion.div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsPageContent />
    </Suspense>
  )
}
