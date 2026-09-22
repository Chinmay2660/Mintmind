'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PasswordForm } from '../_components/PasswordForm'

function NewPasswordContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Password Entry"
        subtitle="Store a new login credential"
        showBack
        backHref="/dashboard/passwords"
      />
      <PasswordForm />
    </div>
  )
}

export default function NewPasswordPage() {
  return (
    <Suspense fallback={null}>
      <NewPasswordContent />
    </Suspense>
  )
}
