'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { InsuranceForm } from '../_components/InsuranceForm'

function EditInsuranceContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Edit Insurance Policy"
        subtitle="Update policy details"
        showBack
        backHref="/dashboard/insurance"
      />
      <InsuranceForm insuranceId={id} />
    </div>
  )
}

export default function EditInsurancePage() {
  return (
    <Suspense fallback={null}>
      <EditInsuranceContent />
    </Suspense>
  )
}
