'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { AccountForm } from '../_components/AccountForm'

function NewAccountContent() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
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
