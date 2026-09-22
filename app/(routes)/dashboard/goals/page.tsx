'use client'

import React, { Suspense } from 'react'
import { Target } from 'lucide-react'
import { format } from 'date-fns'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { ProgressBar } from '@/components/ui/progress-bar'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useApiList } from '@/lib/hooks/useApiList'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect, useEditActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { GoalForm } from './_components/GoalForm'

type Goal = {
  _id: string
  title: string
  description?: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  category: string
  monthlyContribution?: number
  expectedReturn?: number
  progress?: number
  status?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  savings: 'Savings',
  investment: 'Investment',
  expense: 'Expense',
  other: 'Other',
  marriage: 'Marriage',
  emergency: 'Emergency',
  car: 'Car',
  house: 'House',
  vacation: 'Vacation',
  education: 'Education',
  retirement: 'Retirement',
}

const GoalsPageContent = () => {
  const { data: goals, loading, reload } = useApiList<Goal>('/api/goals')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, entityId, openSheet, closeSheet } = useFormSheet()

  useSyncedRefresh(reload)
  useAddActionRedirect(openSheet)
  useEditActionRedirect(openSheet)

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Goal',
      description: 'Are you sure you want to delete this goal?',
      onConfirm: async () => {
        await request.delete(`/api/goals/${id}`)
        toast.success('Goal deleted successfully')
        await reload()
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Goals" subtitle="Track progress toward your financial targets">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>Add Goal</AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openSheet} label="Add goal" />

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-2 w-full mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Set a savings target and track your progress over time"
            actionLabel="Create Your First Goal"
            onAction={openSheet}
          />
        ) : (
          goals.map((goal, index) => {
            const progress = goal.progress ?? 0
            const isComplete = goal.status === 'completed' || progress >= 100

            return (
              <Card key={goal._id} delay={0.1 + index * 0.05} hover className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground">{goal.title}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded capitalize">
                        {CATEGORY_LABELS[goal.category] ?? goal.category}
                      </span>
                      {isComplete && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-success/10 text-success rounded">
                          Completed
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
                    )}
                  </div>
                  <RowActions>
                    <EditButton onClick={() => openSheet(goal._id)} />
                    <DeleteButton onClick={() => handleDelete(goal._id)} />
                  </RowActions>
                </div>

                <ProgressBar
                  value={goal.currentAmount}
                  max={goal.targetAmount}
                  showLabel
                  variant={isComplete ? 'success' : 'default'}
                  className="mb-3"
                />

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium text-foreground">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                  {goal.targetDate && (
                    <span className="text-muted-foreground">
                      Target: {format(new Date(goal.targetDate), 'MMM dd, yyyy')}
                    </span>
                  )}
                  {(goal.monthlyContribution ?? 0) > 0 && (
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.monthlyContribution)}/mo
                    </span>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      <FormSheet open={open} onOpenChange={setOpen} title={entityId ? 'Edit Goal' : 'Add Goal'}>
        <GoalForm
          key={entityId ?? 'new'}
          goalId={entityId}
          variant="sheet"
          onSuccess={() => {
            closeSheet()
            reload()
          }}
          onCancel={closeSheet}
        />
      </FormSheet>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsPageContent />
    </Suspense>
  )
}
