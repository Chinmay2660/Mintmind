'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { LoanDetail } from '../_components/LoanDetail'

function LoanDetailContent() {
  const params = useParams()
  const id = params.id as string
  return <LoanDetail loanId={id} />
}

export default function LoanDetailPage() {
  return (
    <Suspense fallback={null}>
      <LoanDetailContent />
    </Suspense>
  )
}
