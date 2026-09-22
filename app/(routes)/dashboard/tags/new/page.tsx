'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { TagForm } from '../_components/TagForm'

function NewTagContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Tag"
        subtitle="Create a new transaction tag"
        showBack
        backHref="/dashboard/tags"
      />
      <TagForm />
    </div>
  )
}

export default function NewTagPage() {
  return (
    <Suspense fallback={null}>
      <NewTagContent />
    </Suspense>
  )
}
