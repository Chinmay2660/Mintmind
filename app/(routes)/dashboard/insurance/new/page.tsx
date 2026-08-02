'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { InsuranceForm } from '../_components/InsuranceForm'

function NewInsuranceContent() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Add Insurance Policy"
        subtitle="Track a new insurance policy"
        showBack
        backHref="/dashboard/insurance"
      />
      <InsuranceForm />
    </div>
  )
}

export default function NewInsurancePage() {
  return (
    <Suspense fallback={null}>
      <NewInsuranceContent />
    </Suspense>
  )
}
