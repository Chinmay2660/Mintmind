'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { CreditCardForm } from '../_components/CreditCardForm'

function NewCreditCardContent() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
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
