'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/ErrorFallback'

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorFallback error={error} reset={reset} />
}
