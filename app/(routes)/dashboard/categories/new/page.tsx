'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { CategoryForm } from '../_components/CategoryForm'

function NewCategoryContent() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Add Category"
        subtitle="Create a new expense or income category"
        showBack
        backHref="/dashboard/categories"
      />
      <CategoryForm />
    </div>
  )
}

export default function NewCategoryPage() {
  return (
    <Suspense fallback={null}>
      <NewCategoryContent />
    </Suspense>
  )
}
