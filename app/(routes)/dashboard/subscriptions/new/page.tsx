'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SubscriptionForm } from '../_components/SubscriptionForm'

function NewSubscriptionContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Subscription"
        subtitle="Track a new recurring subscription"
        showBack
        backHref="/dashboard/subscriptions"
      />
      <SubscriptionForm />
    </div>
  )
}

export default function NewSubscriptionPage() {
  return (
    <Suspense fallback={null}>
      <NewSubscriptionContent />
    </Suspense>
  )
}
