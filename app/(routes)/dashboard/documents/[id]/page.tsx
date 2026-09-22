'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { DocumentForm } from '../_components/DocumentForm'

function EditDocumentContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Document"
        subtitle="Update document details"
        showBack
        backHref="/dashboard/documents"
      />
      <DocumentForm documentId={id} />
    </div>
  )
}

export default function EditDocumentPage() {
  return (
    <Suspense fallback={null}>
      <EditDocumentContent />
    </Suspense>
  )
}
