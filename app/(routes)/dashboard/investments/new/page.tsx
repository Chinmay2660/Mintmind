'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvestmentForm } from '../_components/InvestmentForm'

function NewInvestmentContent() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Add Investment"
        subtitle="Track a new investment"
        showBack
        backHref="/dashboard/investments"
      />
      <InvestmentForm />
    </div>
  )
}

export default function NewInvestmentPage() {
  return (
    <Suspense fallback={null}>
      <NewInvestmentContent />
    </Suspense>
  )
}
