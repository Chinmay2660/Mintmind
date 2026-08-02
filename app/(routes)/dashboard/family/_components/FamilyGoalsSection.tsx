'use client'

import { useMemo, useState } from 'react'
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
import { getActiveMembers, normalizeId } from '@/lib/utils/family'
import { equalSplitPercentages } from '@/lib/utils/goalSplits'
import type { Family, FamilyGoal } from '@/types/family'

interface FamilyGoalsSectionProps {
  goals: FamilyGoal[]
  loading: boolean
  onRefresh: () => void
  isFamilyHead: boolean
  family: Family
  currentUserId?: string
}

const defaultForm = {
  title: '',
  description: '',
  targetAmount: 0,
  targetDate: '',
  category: 'savings' as FamilyGoal['category'],
}

function buildDefaultSplits(family: Family): Record<string, number> {
  const members = getActiveMembers(family)
  const ids = members.map((m) => normalizeId(m.user)).filter(Boolean) as string[]
  const percentages = equalSplitPercentages(ids.length)
  return Object.fromEntries(ids.map((id, i) => [id, percentages[i]]))
}

function splitsFromGoal(goal: FamilyGoal): Record<string, number> {
  if (!goal.memberSplits?.length) return {}
  return Object.fromEntries(
    goal.memberSplits.map((s) => [normalizeId(s.user) ?? '', s.percentage])
  )
}

export function FamilyGoalsSection({
  goals,
  loading,
  onRefresh,
  isFamilyHead,
  family,
  currentUserId,
}: FamilyGoalsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isContributeOpen, setIsContributeOpen] = useState(false)
  const [contributingGoal, setContributingGoal] = useState<FamilyGoal | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [editingGoal, setEditingGoal] = useState<FamilyGoal | null>(null)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [formData, setFormData] = useState(defaultForm)
  const [splitPercentages, setSplitPercentages] = useState<Record<string, number>>({})

  const activeMembers = useMemo(() => getActiveMembers(family), [family])
  const splitTotal = useMemo(
    () => Object.values(splitPercentages).reduce((sum, pct) => sum + (pct || 0), 0),
    [splitPercentages]
  )

  const getMemberSplit = (goal: FamilyGoal, userId?: string) => {
    if (!userId || !goal.memberSplits?.length) return null
    return goal.memberSplits.find((s) => normalizeId(s.user) === userId) ?? null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Math.abs(splitTotal - 100) > 0.01) {
      toast.error('Split percentages must add up to 100%')
      return
    }

    const memberIds = activeMembers.map((m) => normalizeId(m.user)).filter(Boolean) as string[]
    const payload = {
      ...formData,
      splitPercentages: memberIds.map((id) => splitPercentages[id] ?? 0),
    }

    try {
      if (editingGoal) {
        await request.put(`/api/family/goals/${editingGoal._id}`, payload)
        toast.success('Goal updated successfully')
      } else {
        await request.post('/api/family/goals', payload)
        toast.success('Goal created — personal goals added for each member')
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
      await request.put(`/api/family/goals/${contributingGoal._id}`, { contributeAmount: amount })
      toast.success('Contribution added to your share')
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
      description: 'This will also remove linked personal goals for all members.',
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
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
      category: goal.category,
    })
    setSplitPercentages(
      goal.memberSplits?.length ? splitsFromGoal(goal) : buildDefaultSplits(family)
    )
    setIsDialogOpen(true)
  }

  const openCreate = () => {
    resetForm()
    setSplitPercentages(buildDefaultSplits(family))
    setIsDialogOpen(true)
  }

  const openContribute = (goal: FamilyGoal) => {
    setContributingGoal(goal)
    setContributeAmount('')
    setIsContributeOpen(true)
  }

  const resetForm = () => {
    setFormData(defaultForm)
    setSplitPercentages(buildDefaultSplits(family))
  }

  const updateSplit = (memberId: string, value: number) => {
    setSplitPercentages((prev) => ({ ...prev, [memberId]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Family Goals</h2>
          <p className="text-sm text-muted-foreground">
            Split goals across members — each person tracks their share in their personal account
          </p>
        </div>
        {isFamilyHead && (
          <div className="hidden md:block">
            <AddButton onClick={openCreate}>Add Goal</AddButton>
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
              value={formData.targetAmount || ''}
              onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
              required
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

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Member Split</label>
              <span className={`text-xs ${Math.abs(splitTotal - 100) <= 0.01 ? 'text-muted-foreground' : 'text-red-500'}`}>
                Total: {splitTotal.toFixed(1)}%
              </span>
            </div>
            {activeMembers.map((member) => {
              const memberId = normalizeId(member.user)
              if (!memberId) return null
              const pct = splitPercentages[memberId] ?? 0
              const shareAmount = formData.targetAmount > 0
                ? Math.round((formData.targetAmount * pct) / 100)
                : 0
              return (
                <div key={memberId} className="flex items-center gap-3">
                  <span className="text-sm flex-1 min-w-0 truncate">
                    {member.user.name || member.user.email}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      value={pct || ''}
                      onChange={(e) => updateSplit(memberId, parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-20 text-right"
                      aria-label={`Split percentage for ${member.user.name || member.user.email}`}
                    />
                    <span className="text-sm text-muted-foreground w-4">%</span>
                    <span className="text-xs text-muted-foreground w-24 text-right hidden sm:block">
                      {formatCurrency(shareAmount)}
                    </span>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground">
              e.g. Car ₹10L — you 70% (₹7L), spouse 30% (₹3L). Each member gets a personal goal for their share.
            </p>
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
          {contributingGoal && currentUserId && (() => {
            const mySplit = getMemberSplit(contributingGoal, currentUserId)
            return (
              <p className="text-sm text-muted-foreground">
                Contributing to <span className="font-medium text-foreground">{contributingGoal.title}</span>
                {mySplit && (
                  <>
                    {' '}— your share: {formatCurrency(mySplit.currentAmount)} / {formatCurrency(mySplit.targetAmount)}
                  </>
                )}
              </p>
            )
          })()}
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
        <FAB onClick={openCreate} label="Add family goal" />
      )}

      {loading ? (
        <ListItemSkeleton />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No Goals Yet"
          description="Create your first family goal to start tracking"
          actionLabel={isFamilyHead ? 'Add Goal' : null}
          onAction={isFamilyHead ? openCreate : null}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            const isComplete = progress >= 100
            const mySplit = getMemberSplit(goal, currentUserId)
            const canContribute = !isComplete && mySplit != null

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
                      {mySplit && (
                        <p className="text-xs text-primary font-medium">
                          Your share: {formatCurrency(mySplit.currentAmount)} / {formatCurrency(mySplit.targetAmount)} ({mySplit.percentage}%)
                        </p>
                      )}
                      {goal.memberSplits && goal.memberSplits.length > 1 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {goal.memberSplits.map((split) => {
                            const memberId = normalizeId(split.user)
                            const isMe = memberId === currentUserId
                            const memberProgress = split.targetAmount > 0
                              ? Math.round((split.currentAmount / split.targetAmount) * 100)
                              : 0
                            return (
                              <span
                                key={memberId}
                                className={`text-xs px-2 py-1 rounded-full bg-muted ${isMe ? 'ring-1 ring-primary' : ''}`}
                              >
                                {split.user.name || split.user.email}: {memberProgress}%
                              </span>
                            )
                          })}
                        </div>
                      )}
                      {goal.targetDate && (
                        <p className="text-xs text-muted-foreground">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {canContribute && (
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
