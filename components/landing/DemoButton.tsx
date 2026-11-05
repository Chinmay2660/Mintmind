'use client'

import { useState } from 'react'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Starts Demo Mode (no sign-up) and opens the dashboard. */
export function DemoButton({ variant = 'outline', label = 'Explore demo account', size }: { variant?: 'default' | 'outline' | 'secondary'; label?: string; size?: 'default' | 'lg' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant={variant}
        size={size}
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(false)
          try {
            await axios.post('/api/auth/demo')
            window.location.href = '/dashboard'
          } catch {
            setBusy(false)
            setError(true)
          }
        }}
      >
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {label}
      </Button>
      {error && <span role="alert" className="text-xs text-destructive">Couldn&apos;t start the demo. Try again.</span>}
    </span>
  )
}
