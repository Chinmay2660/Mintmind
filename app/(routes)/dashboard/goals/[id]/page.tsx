'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { GoalForm } from '../_components/GoalForm'

function EditGoalContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Goal"
        subtitle="Update goal details and progress"
        showBack
        backHref="/dashboard/goals"
      />
      <GoalForm goalId={id} />
    </div>
  )
}

export default function EditGoalPage() {
  return (
    <Suspense fallback={null}>
      <EditGoalContent />
    </Suspense>
  )
}
