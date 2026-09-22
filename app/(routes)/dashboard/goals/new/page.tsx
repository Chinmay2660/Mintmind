'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { GoalForm } from '../_components/GoalForm'

function NewGoalContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Goal"
        subtitle="Set a new financial target"
        showBack
        backHref="/dashboard/goals"
      />
      <GoalForm />
    </div>
  )
}

export default function NewGoalPage() {
  return (
    <Suspense fallback={null}>
      <NewGoalContent />
    </Suspense>
  )
}
