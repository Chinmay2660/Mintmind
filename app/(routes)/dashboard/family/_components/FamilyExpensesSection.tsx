'use client'

import { useState } from 'react'
import { ReceiptText } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { EmptyState } from '@/components/ui/empty-state'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { AddButton } from '@/components/ui/AddButton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import type { Family, FamilyExpense } from '@/types/family'
import type { User } from '@/types/user'
import { getActiveMembers, isFamilyHead, normalizeId } from '@/lib/utils/family'

interface FamilyExpensesSectionProps {
  expenses: FamilyExpense[]
  loading: boolean
  onRefresh: () => void
  family: Family
  user: User | null
}

const defaultForm = (userId: string) => ({
  title: '',
  description: '',
  amount: 0,
  category: '',
  date: new Date().toISOString().split('T')[0],
  paidBy: userId,
})

export function FamilyExpensesSection({ expenses, loading, onRefresh, family, user }: FamilyExpensesSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FamilyExpense | null>(null)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [formData, setFormData] = useState(defaultForm(user?.id ?? ''))

  const head = isFamilyHead(family, user?.id)
  const members = getActiveMembers(family)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingExpense) {
        await request.put(`/api/family/expenses/${editingExpense._id}`, formData)
        toast.success('Expense updated successfully')
      } else {
        await request.post('/api/family/expenses', formData)
        toast.success('Expense added successfully')
      }
      setIsDialogOpen(false)
      setEditingExpense(null)
      resetForm()
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save expense')
    }
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Expense',
      description: 'Are you sure you want to delete this expense?',
      onConfirm: async () => {
        await request.delete(`/api/family/expenses/${id}`)
        toast.success('Expense deleted successfully')
        onRefresh()
      },
    })
  }

  const handleEdit = (expense: FamilyExpense) => {
    setEditingExpense(expense)
    setFormData({
      title: expense.title,
      description: expense.description ?? '',
      amount: expense.amount,
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      paidBy: normalizeId(expense.paidBy) ?? user?.id ?? '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => setFormData(defaultForm(user?.id ?? ''))

  const canEditExpense = (expense: FamilyExpense) => {
    if (head) return true
    return normalizeId(expense.createdBy) === user?.id
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Family Expenses</h2>
          <p className="text-sm text-muted-foreground">Track shared expenses across the circle</p>
        </div>
        <div className="hidden md:block">
          <AddButton onClick={() => { resetForm(); setIsDialogOpen(true) }}>Add Expense</AddButton>
        </div>
      </div>

      <FormSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingExpense ? 'Edit Expense' : 'Add Family Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              placeholder="e.g. Groceries, Dining"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Paid By</label>
            <select
              value={formData.paidBy}
              onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            >
              {members.map((member) => (
                <option key={normalizeId(member.user)} value={normalizeId(member.user)}>
                  {member.user.name || member.user.email}
                </option>
              ))}
            </select>
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
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <FormButtonGroup
            submitLabel={editingExpense ? 'Update Expense' : 'Add Expense'}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingExpense(null)
              resetForm()
            }}
          />
        </form>
      </FormSheet>

      <FAB onClick={() => { resetForm(); setIsDialogOpen(true) }} label="Add family expense" />

      {loading ? (
        <ListItemSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No Expenses Yet"
          description="Add your first family expense to start tracking"
          actionLabel="Add Expense"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => {
            const paidByUser = typeof expense.paidBy === 'object' ? expense.paidBy : null
            const canEdit = canEditExpense(expense)

            return (
              <Card key={expense._id} hover>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{expense.title}</h3>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(expense.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">{expense.category}</p>
                      {expense.description && (
                        <p className="text-sm text-muted-foreground">{expense.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Paid by: {paidByUser?.name || paidByUser?.email || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(expense.date, 'd MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <EditButton onClick={() => handleEdit(expense)} />
                      <DeleteButton onClick={() => handleDelete(expense._id)} />
                    </div>
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
