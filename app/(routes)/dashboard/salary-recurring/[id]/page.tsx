'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { SalaryForm } from '../_components/SalaryForm'

function EditSalaryContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Salary"
        subtitle="Update salary details"
        showBack
        backHref="/dashboard/salary-recurring"
      />
      <SalaryForm salaryId={id} />
    </div>
  )
}

export default function EditSalaryPage() {
  return (
    <Suspense fallback={null}>
      <EditSalaryContent />
    </Suspense>
  )
}
