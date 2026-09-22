'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DocumentForm } from '../_components/DocumentForm'

function NewDocumentContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Document"
        subtitle="Add document metadata"
        showBack
        backHref="/dashboard/documents"
      />
      <DocumentForm />
    </div>
  )
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={null}>
      <NewDocumentContent />
    </Suspense>
  )
}
