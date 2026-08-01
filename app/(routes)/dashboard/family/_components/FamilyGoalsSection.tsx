'use client'

import { useState } from 'react'
import { Target, Plus } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { EmptyState } from '@/components/ui/empty-state'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { AddButton } from '@/components/ui/AddButton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import type { FamilyGoal } from '@/types/family'

interface FamilyGoalsSectionProps {
  goals: FamilyGoal[]
  loading: boolean
  onRefresh: () => void
  isFamilyHead: boolean
}

const defaultForm = {
  title: '',
  description: '',
  targetAmount: 0,
  currentAmount: 0,
  targetDate: '',
  category: 'savings' as FamilyGoal['category'],
}

export function FamilyGoalsSection({ goals, loading, onRefresh, isFamilyHead }: FamilyGoalsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isContributeOpen, setIsContributeOpen] = useState(false)
  const [contributingGoal, setContributingGoal] = useState<FamilyGoal | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [editingGoal, setEditingGoal] = useState<FamilyGoal | null>(null)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [formData, setFormData] = useState(defaultForm)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingGoal) {
        await request.put(`/api/family/goals/${editingGoal._id}`, formData)
        toast.success('Goal updated successfully')
      } else {
        await request.post('/api/family/goals', formData)
        toast.success('Goal created successfully')
      }
      setIsDialogOpen(false)
      setEditingGoal(null)
      resetForm()
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save goal')
    }
  }

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contributingGoal) return
    const amount = parseFloat(contributeAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    try {
      const newAmount = contributingGoal.currentAmount + amount
      await request.put(`/api/family/goals/${contributingGoal._id}`, { currentAmount: newAmount })
      toast.success('Contribution added')
      setIsContributeOpen(false)
      setContributingGoal(null)
      setContributeAmount('')
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to contribute')
    }
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Goal',
      description: 'Are you sure you want to delete this goal?',
      onConfirm: async () => {
        await request.delete(`/api/family/goals/${id}`)
        toast.success('Goal deleted successfully')
        onRefresh()
      },
    })
  }

  const handleEdit = (goal: FamilyGoal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      description: goal.description ?? '',
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
      category: goal.category,
    })
    setIsDialogOpen(true)
  }

  const openContribute = (goal: FamilyGoal) => {
    setContributingGoal(goal)
    setContributeAmount('')
    setIsContributeOpen(true)
  }

  const resetForm = () => setFormData(defaultForm)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Family Goals</h2>
          <p className="text-sm text-muted-foreground">Set and track shared financial goals</p>
        </div>
        {isFamilyHead && (
          <div className="hidden md:block">
            <AddButton onClick={() => { resetForm(); setIsDialogOpen(true) }}>Add Goal</AddButton>
          </div>
        )}
      </div>

      <FormSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingGoal ? 'Edit Goal' : 'Create Family Goal'}
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
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Target Amount</label>
            <Input
              type="number"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
              required
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Current Amount</label>
            <Input
              type="number"
              value={formData.currentAmount}
              onChange={(e) => setFormData({ ...formData, currentAmount: parseFloat(e.target.value) || 0 })}
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Target Date</label>
            <Input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as FamilyGoal['category'] })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
              <option value="expense">Expense</option>
              <option value="other">Other</option>
            </select>
          </div>
          <FormButtonGroup
            submitLabel={editingGoal ? 'Update Goal' : 'Create Goal'}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingGoal(null)
              resetForm()
            }}
          />
        </form>
      </FormSheet>

      <FormSheet open={isContributeOpen} onOpenChange={setIsContributeOpen} title="Contribute to Goal">
        <form onSubmit={handleContribute} className="space-y-4">
          {contributingGoal && (
            <p className="text-sm text-muted-foreground">
              Contributing to <span className="font-medium text-foreground">{contributingGoal.title}</span>
              {' '}({formatCurrency(contributingGoal.currentAmount)} saved so far)
            </p>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input
              type="number"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <FormButtonGroup
            submitLabel="Add Contribution"
            onCancel={() => {
              setIsContributeOpen(false)
              setContributingGoal(null)
              setContributeAmount('')
            }}
          />
        </form>
      </FormSheet>

      {isFamilyHead && (
        <FAB onClick={() => { resetForm(); setIsDialogOpen(true) }} label="Add family goal" />
      )}

      {loading ? (
        <ListItemSkeleton />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No Goals Yet"
          description="Create your first family goal to start tracking"
          actionLabel={isFamilyHead ? 'Add Goal' : null}
          onAction={isFamilyHead ? () => setIsDialogOpen(true) : null}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            const isComplete = progress >= 100
            return (
              <Card key={goal._id} hover>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{goal.title}</h3>
                      {isComplete && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          Complete
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      {goal.targetDate && (
                        <p className="text-xs text-muted-foreground">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {!isFamilyHead && !isComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => openContribute(goal)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Contribute
                      </Button>
                    )}
                  </div>
                  {isFamilyHead && (
                    <div className="flex gap-1 shrink-0">
                      <EditButton onClick={() => handleEdit(goal)} />
                      <DeleteButton onClick={() => handleDelete(goal._id)} />
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
