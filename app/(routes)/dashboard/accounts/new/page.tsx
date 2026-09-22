'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { AccountForm } from '../_components/AccountForm'

function NewAccountContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Account"
        subtitle="Add a new bank account"
        showBack
        backHref="/dashboard/accounts"
      />
      <AccountForm />
    </div>
  )
}

export default function NewAccountPage() {
  return (
    <Suspense fallback={null}>
      <NewAccountContent />
    </Suspense>
  )
}
