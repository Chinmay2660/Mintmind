'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { CategoryForm } from '../_components/CategoryForm'

function EditCategoryContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Edit Category"
        subtitle="Update category details"
        showBack
        backHref="/dashboard/categories"
      />
      <CategoryForm categoryId={id} />
    </div>
  )
}

export default function EditCategoryPage() {
  return (
    <Suspense fallback={null}>
      <EditCategoryContent />
    </Suspense>
  )
}
