'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvestmentForm } from '../_components/InvestmentForm'

function EditInvestmentContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader
        title="Edit Investment"
        subtitle="Update investment details"
        showBack
        backHref="/dashboard/investments"
      />
      <InvestmentForm investmentId={id} />
    </div>
  )
}

export default function EditInvestmentPage() {
  return (
    <Suspense fallback={null}>
      <EditInvestmentContent />
    </Suspense>
  )
}
