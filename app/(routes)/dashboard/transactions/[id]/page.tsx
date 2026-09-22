'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { TransactionForm } from '../_components/TransactionForm'

function EditTransactionContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Transaction"
        subtitle="Update transaction details"
        showBack
        backHref="/dashboard/transactions"
      />
      <TransactionForm transactionId={id} />
    </div>
  )
}

export default function EditTransactionPage() {
  return (
    <Suspense fallback={null}>
      <EditTransactionContent />
    </Suspense>
  )
}
