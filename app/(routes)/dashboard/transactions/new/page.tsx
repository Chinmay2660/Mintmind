'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { TransactionForm } from '../_components/TransactionForm'

function NewTransactionContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type')
  const subtitle =
    type === 'income'
      ? 'Record new income'
      : type === 'transfer'
        ? 'Move money between accounts'
        : 'Record a new expense'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Transaction"
        subtitle={subtitle}
        showBack
        backHref="/dashboard/transactions"
      />
      <TransactionForm />
    </div>
  )
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={null}>
      <NewTransactionContent />
    </Suspense>
  )
}
