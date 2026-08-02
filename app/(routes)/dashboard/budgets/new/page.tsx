'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BudgetForm } from '../_components/BudgetForm'

function NewBudgetContent() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Create Budget"
        subtitle="Set a new spending limit"
        showBack
        backHref="/dashboard/budgets"
      />
      <BudgetForm />
    </div>
  )
}

export default function NewBudgetPage() {
  return (
    <Suspense fallback={null}>
      <NewBudgetContent />
    </Suspense>
  )
}
