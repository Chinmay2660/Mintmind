'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoanForm } from '../_components/LoanForm'

function NewLoanContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Loan"
        subtitle="Track a new loan"
        showBack
        backHref="/dashboard/loans"
      />
      <LoanForm />
    </div>
  )
}

export default function NewLoanPage() {
  return (
    <Suspense fallback={null}>
      <NewLoanContent />
    </Suspense>
  )
}
