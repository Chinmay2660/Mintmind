'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { PasswordForm } from '../_components/PasswordForm'

function EditPasswordContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Password Entry"
        subtitle="Update login credential details"
        showBack
        backHref="/dashboard/passwords"
      />
      <PasswordForm passwordId={id} />
    </div>
  )
}

export default function EditPasswordPage() {
  return (
    <Suspense fallback={null}>
      <EditPasswordContent />
    </Suspense>
  )
}
