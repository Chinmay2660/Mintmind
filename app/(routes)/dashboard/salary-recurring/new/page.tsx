'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SalaryForm } from '../_components/SalaryForm'

function NewSalaryContent() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
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
