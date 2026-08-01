'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorFallbackProps {
  error?: Error | null
  reset?: () => void
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full surface-card p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {reset && (
            <Button onClick={reset}>Try again</Button>
          )}
          <Button
            variant="outline"
            onClick={() => { window.location.href = '/' }}
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
