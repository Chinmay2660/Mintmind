'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { TransactionForm } from '../_components/TransactionForm'

function EditTransactionContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
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
