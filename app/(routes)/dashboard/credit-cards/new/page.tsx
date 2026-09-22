'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { CreditCardForm } from '../_components/CreditCardForm'

function NewCreditCardContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Credit Card"
        subtitle="Track a new credit card"
        showBack
        backHref="/dashboard/credit-cards"
      />
      <CreditCardForm />
    </div>
  )
}

export default function NewCreditCardPage() {
  return (
    <Suspense fallback={null}>
      <NewCreditCardContent />
    </Suspense>
  )
}
