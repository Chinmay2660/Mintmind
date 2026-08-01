'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { Plus, TrendingUp, Edit, Trash2, Calendar, DollarSign } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
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
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'

const InvestmentsPageContent = () => {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [investments, setInvestments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
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
      const response = await request.get('/api/investments', { params })
      setInvestments(response.data)
    } catch (error) {
      toast.error('Failed to load investments')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await request.get('/api/bank-accounts')
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
        await request.put(`/api/investments/${editingInvestment._id}`, payload)
        toast.success('Investment updated successfully')
      } else {
        await request.post('/api/investments', payload)
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

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Investment',
      description: 'Are you sure you want to delete this investment?',
      onConfirm: async () => {
        await request.delete(`/api/investments/${id}`)
        toast.success('Investment deleted successfully')
        fetchInvestments()
      },
    })
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

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const totalCurrentValue = investments.reduce(
    (sum, inv) => sum + (inv.currentValue || inv.amount || 0),
    0
  )
  const totalGain = totalCurrentValue - totalInvested

  const openAddForm = () => {
    resetForm()
    setEditingInvestment(null)
    setIsDialogOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openAddForm()
    }
  }, [searchParams])

  const investmentForm = (
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
      <FormButtonGroup
        submitLabel={editingInvestment ? 'Update Investment' : 'Add Investment'}
        onCancel={() => setIsDialogOpen(false)}
      />
    </form>
  )

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader
        title="Investments"
        subtitle="Track your investment portfolio"
        showBack
      >
        <div className="hidden md:block">
          <AddButton onClick={openAddForm}>Add Investment</AddButton>
        </div>
      </PageHeader>

      <FormSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingInvestment ? 'Edit Investment' : 'Add New Investment'}
      >
        {investmentForm}
      </FormSheet>

      <FAB onClick={openAddForm} label="Add investment" />

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
      <FilterButtonGroup
        value={filterType}
        onValueChange={setFilterType}
        options={[
          { value: 'all', label: 'All' },
          { value: 'FD', label: 'Fixed Deposits' },
          { value: 'Mutual Fund', label: 'Mutual Funds' },
          { value: 'Stock', label: 'Stocks' },
        ]}
        className="flex-wrap"
      />

      {/* Investments List */}
      <div className="space-y-3">
        {loading ? (
          // Show skeletons while loading
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="surface-card rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
              <div className="h-8 bg-muted rounded w-40"></div>
            </div>
          ))
        ) : investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investments yet"
            description="Add your first investment to get started"
            actionLabel="Add Your First Investment"
            onAction={openAddForm}
          />
        ) : (
          investments.map((investment) => {
            const gain = (investment.currentValue || investment.amount) - investment.amount
            const gainPercent = investment.amount > 0 ? (gain / investment.amount) * 100 : 0

            return (
              <SwipeableRow
                key={investment._id}
                onEdit={() => handleEdit(investment)}
                onDelete={() => handleDelete(investment._id)}
              >
                <Card
                  delay={0.1}
                  hover={true}
                  className="p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {investment.name}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                          {investment.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Invested: {format(new Date(investment.investedDate), 'MMM dd, yyyy')}
                      </p>
                      {investment.maturityDate && (
                        <p className="text-sm text-muted-foreground">
                          Maturity: {format(new Date(investment.maturityDate), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <DesktopRowActions>
                      <EditButton onClick={() => handleEdit(investment)} />
                      <DeleteButton onClick={() => handleDelete(investment._id)} />
                    </DesktopRowActions>
                  </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Invested</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(investment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(investment.currentValue || investment.amount)}
                    </p>
                  </div>
                </div>
                {investment.currentValue && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gain/Loss</span>
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Interest Rate: {investment.interestRate}%
                  </p>
                )}
                {investment.maturityType && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Maturity Type: {investment.maturityType}
                  </p>
                )}
              </Card>
              </SwipeableRow>
            )
          })
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function InvestmentsPage() {
  return (
    <Suspense fallback={null}>
      <InvestmentsPageContent />
    </Suspense>
  )
}

