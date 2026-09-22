'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { BudgetForm } from '../_components/BudgetForm'

function EditBudgetContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Budget"
        subtitle="Update budget details"
        showBack
        backHref="/dashboard/budgets"
      />
      <BudgetForm budgetId={id} />
    </div>
  )
}

export default function EditBudgetPage() {
  return (
    <Suspense fallback={null}>
      <EditBudgetContent />
    </Suspense>
  )
}
