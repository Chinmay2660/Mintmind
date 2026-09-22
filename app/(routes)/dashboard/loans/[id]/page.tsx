'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoanForm } from '../_components/LoanForm'

function EditLoanContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Loan"
        subtitle="Update loan details"
        showBack
        backHref="/dashboard/loans"
      />
      <LoanForm loanId={id} />
    </div>
  )
}

export default function EditLoanPage() {
  return (
    <Suspense fallback={null}>
      <EditLoanContent />
    </Suspense>
  )
}
