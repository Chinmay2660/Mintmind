'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { CreditCardForm } from '../_components/CreditCardForm'

function EditCreditCardContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Edit Credit Card"
        subtitle="Update card details"
        showBack
        backHref="/dashboard/credit-cards"
      />
      <CreditCardForm creditCardId={id} />
    </div>
  )
}

export default function EditCreditCardPage() {
  return (
    <Suspense fallback={null}>
      <EditCreditCardContent />
    </Suspense>
  )
}
