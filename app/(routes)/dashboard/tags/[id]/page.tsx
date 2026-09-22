'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { TagForm } from '../_components/TagForm'

function EditTagContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Tag"
        subtitle="Update tag details"
        showBack
        backHref="/dashboard/tags"
      />
      <TagForm tagId={id} />
    </div>
  )
}

export default function EditTagPage() {
  return (
    <Suspense fallback={null}>
      <EditTagContent />
    </Suspense>
  )
}
