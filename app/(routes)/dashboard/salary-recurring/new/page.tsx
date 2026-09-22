'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SalaryForm } from '../_components/SalaryForm'

function NewSalaryContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Salary"
        subtitle="Record your recurring salary income"
        showBack
        backHref="/dashboard/salary-recurring"
      />
      <SalaryForm />
    </div>
  )
}

export default function NewSalaryPage() {
  return (
    <Suspense fallback={null}>
      <NewSalaryContent />
    </Suspense>
  )
}
