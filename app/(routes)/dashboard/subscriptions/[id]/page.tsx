'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { SubscriptionForm } from '../_components/SubscriptionForm'

function EditSubscriptionContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Subscription"
        subtitle="Update subscription details"
        showBack
        backHref="/dashboard/subscriptions"
      />
      <SubscriptionForm subscriptionId={id} />
    </div>
  )
}

export default function EditSubscriptionPage() {
  return (
    <Suspense fallback={null}>
      <EditSubscriptionContent />
    </Suspense>
  )
}
