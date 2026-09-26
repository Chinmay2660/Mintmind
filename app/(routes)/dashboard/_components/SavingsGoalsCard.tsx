'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Target } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'
import { FormSheet } from '@/components/ui/form-sheet'
import { GoalForm } from '../goals/_components/GoalForm'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'
import { withFromHome } from '@/lib/utils/navigation'

export interface DashboardGoal {
  _id: string
  title: string
  targetAmount: number
  currentAmount: number
  progress?: number
}

const MAX_GOALS = 4

interface SavingsGoalsCardProps {
  goals: DashboardGoal[] | null
  loading: boolean
  className?: string
  onGoalAdded?: () => void
}

export function SavingsGoalsCard({ goals, loading, className, onGoalAdded }: SavingsGoalsCardProps) {
  const { fmt } = usePrivacyAmount()
  const [addOpen, setAddOpen] = useState(false)
  const visible = (goals ?? []).slice(0, MAX_GOALS)

  return (
    <div className={`surface-card flex flex-col p-5 md:p-6 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">Savings goals</h2>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="mm-pill transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-3.5 w-3.5" />
          Add goal
        </button>
      </div>

      <FormSheet open={addOpen} onOpenChange={setAddOpen} title="Add Goal">
        <GoalForm
          variant="sheet"
          onSuccess={() => {
            setAddOpen(false)
            onGoalAdded?.()
          }}
          onCancel={() => setAddOpen(false)}
        />
      </FormSheet>

      <div className="mt-5 flex-1 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)
        ) : goals === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Couldn&apos;t load goals right now.</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No goals yet. Set one to track your progress here.
          </p>
        ) : (
          visible.map((goal) => {
            const pct = goal.progress ?? (goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0)
            return (
              <Link
                key={goal._id}
                href={withFromHome('/dashboard/goals')}
                className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{goal.title}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                    {Math.round(pct)}%
                  </span>
                </div>
                <ProgressBar
                  value={goal.currentAmount}
                  max={goal.targetAmount}
                  size="sm"
                  variant="success"
                  barClassName={pct < 100 ? 'bg-primary' : undefined}
                />
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {fmt(goal.currentAmount)} / {fmt(goal.targetAmount)}
                </p>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
