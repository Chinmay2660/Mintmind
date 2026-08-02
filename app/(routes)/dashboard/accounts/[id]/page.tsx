'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { AccountForm } from '../_components/AccountForm'

function EditAccountContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Edit Account"
        subtitle="Update account details"
        showBack
        backHref="/dashboard/accounts"
      />
      <AccountForm accountId={id} />
    </div>
  )
}

export default function EditAccountPage() {
  return (
    <Suspense fallback={null}>
      <EditAccountContent />
    </Suspense>
  )
}
