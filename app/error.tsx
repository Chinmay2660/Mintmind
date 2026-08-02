'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/ErrorFallback'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorFallback error={error} reset={reset} fullPage />
}
