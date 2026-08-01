'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { Plus, Edit, Trash2, TrendingDown, Calendar, Target, AlertCircle, PiggyBank } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { TabButtonGroup } from '@/components/ui/tab-button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'

const BudgetsPageContent = () => {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    amount: '',
    period: 'monthly',
    startDate: '',
    endDate: '',
    description: '',
  })

  useEffect(() => {
    if (user) {
      fetchBudgets()
      fetchCategories()
    }
  }, [user, selectedPeriod])

  const fetchBudgets = async () => {
    try {
      setLoading(true)
      const response = await request.get(`/api/budgets?period=${selectedPeriod}`)
      setBudgets(response.data)
    } catch (error) {
      toast.error('Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await request.get('/api/categories?type=expense')
      setCategories(response.data)
    } catch (error) {
      // Error handled silently
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingBudget) {
        await request.put(`/api/budgets/${editingBudget._id}`, formData)
        toast.success('Budget updated successfully')
      } else {
        await request.post('/api/budgets', formData)
        toast.success('Budget created successfully')
      }
      setIsDialogOpen(false)
      resetForm()
      fetchBudgets()
    } catch (error) {
      toast.error('Failed to save budget')
    }
  }

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Budget',
      description: 'Are you sure you want to delete this budget?',
      onConfirm: async () => {
        await request.delete(`/api/budgets/${id}`)
        toast.success('Budget deleted successfully')
        fetchBudgets()
      },
    })
  }

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setFormData({
      categoryId: budget.categoryId._id,
      name: budget.name,
      amount: budget.amount,
      period: budget.period,
      startDate: new Date(budget.startDate).toISOString().split('T')[0],
      endDate: new Date(budget.endDate).toISOString().split('T')[0],
      description: budget.description || '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      categoryId: '',
      name: '',
      amount: '',
      period: 'monthly',
      startDate: '',
      endDate: '',
      description: '',
    })
    setEditingBudget(null)
  }

  const calculateEndDate = (startDate, period) => {
    if (!startDate) return ''
    const date = new Date(startDate)
    switch (period) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'half-yearly':
        date.setMonth(date.getMonth() + 6)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
    }
    return date.toISOString().split('T')[0]
  }

  const periodOptions = [
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
  ]

  // Don't show early return - always show header and add button

  const openAddForm = () => {
    resetForm()
    setEditingBudget(null)
    setIsDialogOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openAddForm()
    }
  }, [searchParams])

  const budgetForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">
          Budget Name
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Car Maintenance"
          className="h-12"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">
          Category
        </label>
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">
          Amount
        </label>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="200000"
          className="h-12"
          required
          min="0"
          step="0.01"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">
          Period
        </label>
        <select
          value={formData.period}
          onChange={(e) => {
            const newPeriod = e.target.value
            setFormData({
              ...formData,
              period: newPeriod,
              endDate: formData.startDate
                ? calculateEndDate(formData.startDate, newPeriod)
                : '',
            })
          }}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly (3 Months)</option>
          <option value="half-yearly">Half-Yearly (6 Months)</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">
          Start Date
        </label>
        <Input
          type="date"
          value={formData.startDate}
          onChange={(e) => {
            const newStartDate = e.target.value
            setFormData({
              ...formData,
              startDate: newStartDate,
              endDate: calculateEndDate(newStartDate, formData.period),
            })
          }}
          className="h-12"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">
          End Date
        </label>
        <Input
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          className="h-12"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">
          Description (Optional)
        </label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional notes..."
          className="h-12"
        />
      </div>
      <FormButtonGroup
        submitLabel={editingBudget ? 'Update Budget' : 'Create Budget'}
        onCancel={() => setIsDialogOpen(false)}
        submitClassName="h-12"
        cancelClassName="h-12"
      />
    </form>
  )

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <PageHeader
        title="Budgets"
        subtitle="Manage your spending limits"
        showBack
      >
        <div className="hidden md:block">
          <AddButton onClick={openAddForm}>Add Budget</AddButton>
        </div>
      </PageHeader>

      <FormSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingBudget ? 'Edit Budget' : 'Create New Budget'}
      >
        {budgetForm}
      </FormSheet>

      <FAB onClick={openAddForm} label="Add budget" />

      {/* Period Filter */}
      <TabButtonGroup
        value={selectedPeriod}
        onValueChange={setSelectedPeriod}
        options={periodOptions}
      />

      {/* Budgets List */}
      <div className="space-y-2">
        {loading ? (
          // Show skeletons while loading
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="surface-card p-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-muted"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded w-20"></div>
              </div>
            </div>
          ))
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No budgets yet"
            description="Create your first budget to track spending"
            actionLabel="Create Your First Budget"
            onAction={openAddForm}
          />
        ) : (
          budgets.map((budget, index) => (
            <SwipeableRow
              key={budget._id}
              onEdit={() => handleEdit(budget)}
              onDelete={() => handleDelete(budget._id)}
            >
              <Card
                delay={0.2 + index * 0.05}
                hover={true}
                className="p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{budget.categoryId?.icon || '📁'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base mb-1">
                      {budget.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {budget.categoryId?.name || 'Uncategorized'} • {budget.period}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground">
                        {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(budget.startDate).toLocaleDateString()} -{' '}
                        {new Date(budget.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <DesktopRowActions>
                    <EditButton onClick={() => handleEdit(budget)} />
                    <DeleteButton onClick={() => handleDelete(budget._id)} />
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

export default function BudgetsPage() {
  return (
    <Suspense fallback={null}>
      <BudgetsPageContent />
    </Suspense>
  )
}

