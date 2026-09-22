'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { ReminderForm } from '../_components/ReminderForm'

function EditReminderContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Reminder"
        subtitle="Update reminder details"
        showBack
        backHref="/dashboard/reminders"
      />
      <ReminderForm reminderId={id} />
    </div>
  )
}

export default function EditReminderPage() {
  return (
    <Suspense fallback={null}>
      <EditReminderContent />
    </Suspense>
  )
}
