'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ReminderForm } from '../_components/ReminderForm'

function NewReminderContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Reminder"
        subtitle="Create a new payment or due date reminder"
        showBack
        backHref="/dashboard/reminders"
      />
      <ReminderForm />
    </div>
  )
}

export default function NewReminderPage() {
  return (
    <Suspense fallback={null}>
      <NewReminderContent />
    </Suspense>
  )
}
