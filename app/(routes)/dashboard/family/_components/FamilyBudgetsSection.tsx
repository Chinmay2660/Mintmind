'use client'

import { useState } from 'react'
import { IndianRupee } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { EmptyState } from '@/components/ui/empty-state'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { RowActions } from '@/components/ui/swipeable-row'
import { AddButton } from '@/components/ui/AddButton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import type { FamilyBudget, FamilyExpense } from '@/types/family'

interface FamilyBudgetsSectionProps {
  budgets: FamilyBudget[]
  expenses: FamilyExpense[]
  loading: boolean
  onRefresh: () => void
  isFamilyHead: boolean
}

const defaultForm = {
  categoryName: '',
  amount: 0,
  period: 'monthly' as FamilyBudget['period'],
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  description: '',
}

function getSpentForBudget(budget: FamilyBudget, expenses: FamilyExpense[]): number {
  const start = new Date(budget.startDate)
  const end = new Date(budget.endDate)
  const category = budget.categoryName.toLowerCase()

  return expenses.reduce((sum, expense) => {
    const expenseDate = new Date(expense.date)
    if (expenseDate < start || expenseDate > end) return sum
    if (expense.category.toLowerCase() !== category) return sum
    return sum + expense.amount
  }, 0)
}

export function FamilyBudgetsSection({
  budgets,
  expenses,
  loading,
  onRefresh,
  isFamilyHead,
}: FamilyBudgetsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<FamilyBudget | null>(null)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [formData, setFormData] = useState(defaultForm)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const start = new Date(formData.startDate)
      const endDate = new Date(start)
      if (formData.period === 'monthly') endDate.setMonth(endDate.getMonth() + 1)
      else if (formData.period === 'quarterly') endDate.setMonth(endDate.getMonth() + 3)
      else if (formData.period === 'half-yearly') endDate.setMonth(endDate.getMonth() + 6)
      else if (formData.period === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1)

      const payload = { ...formData, endDate: endDate.toISOString().split('T')[0] }

      if (editingBudget) {
        await request.put(`/api/family/budgets/${editingBudget._id}`, payload)
        toast.success('Budget updated successfully')
      } else {
        await request.post('/api/family/budgets', payload)
        toast.success('Budget created successfully')
      }
      setIsDialogOpen(false)
      setEditingBudget(null)
      resetForm()
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save budget')
    }
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Budget',
      description: 'Are you sure you want to delete this budget?',
      onConfirm: async () => {
        await request.delete(`/api/family/budgets/${id}`)
        toast.success('Budget deleted successfully')
        onRefresh()
      },
    })
  }

  const handleEdit = (budget: FamilyBudget) => {
    setEditingBudget(budget)
    setFormData({
      categoryName: budget.categoryName,
      amount: budget.amount,
      period: budget.period,
      startDate: new Date(budget.startDate).toISOString().split('T')[0],
      endDate: new Date(budget.endDate).toISOString().split('T')[0],
      description: budget.description ?? '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => setFormData(defaultForm)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Family Budgets</h2>
          <p className="text-sm text-muted-foreground">Manage spending limits for the circle</p>
        </div>
        {isFamilyHead && (
          <div className="hidden md:block">
            <AddButton onClick={() => { resetForm(); setIsDialogOpen(true) }}>Add Budget</AddButton>
          </div>
        )}
      </div>

      <FormSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingBudget ? 'Edit Budget' : 'Create Family Budget'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Category Name</label>
            <Input
              value={formData.categoryName}
              onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
              required
              placeholder="e.g. Groceries, Utilities"
            />
            <p className="text-xs text-muted-foreground mt-1">Must match expense category names for tracking</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              required
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Period</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as FamilyBudget['period'] })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half-yearly">Half Yearly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <FormButtonGroup
            submitLabel={editingBudget ? 'Update Budget' : 'Create Budget'}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingBudget(null)
              resetForm()
            }}
          />
        </form>
      </FormSheet>

      {isFamilyHead && (
        <FAB onClick={() => { resetForm(); setIsDialogOpen(true) }} label="Add family budget" />
      )}

      {loading ? (
        <ListItemSkeleton />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No Budgets Yet"
          description="Create your first family budget to manage spending"
          actionLabel={isFamilyHead ? 'Add Budget' : null}
          onAction={isFamilyHead ? () => setIsDialogOpen(true) : null}
        />
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const spent = getSpentForBudget(budget, expenses)
            const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
            const isOver = spent > budget.amount
            return (
              <Card key={budget._id} hover>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{budget.categoryName}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={isOver ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                          {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                        </span>
                        <span className={isOver ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">{budget.period}</p>
                      {budget.description && (
                        <p className="text-sm text-muted-foreground">{budget.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(budget.startDate).toLocaleDateString()} –{' '}
                        {new Date(budget.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {isFamilyHead && (
                    <RowActions>
                      <EditButton onClick={() => handleEdit(budget)} />
                      <DeleteButton onClick={() => handleDelete(budget._id)} />
                    </RowActions>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}
