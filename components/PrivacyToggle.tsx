'use client'

import { Eye, EyeOff } from 'lucide-react'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface PrivacyToggleProps {
  className?: string
  showLabel?: boolean
}

export function PrivacyToggle({ className, showLabel = false }: PrivacyToggleProps) {
  const { privacyMode, togglePrivacyMode } = usePrivacyMode()

  const label = privacyMode ? 'Show amounts' : 'Hide amounts'

  return (
    <Tooltip content={label} side="bottom">
      <button
        type="button"
        onClick={togglePrivacyMode}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
          className
        )}
        aria-label={label}
        aria-pressed={privacyMode}
      >
        {privacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        {showLabel && (
          <span className="ml-2 hidden sm:inline">
            {privacyMode ? 'Show amounts' : 'Hide amounts'}
          </span>
        )}
      </button>
    </Tooltip>
  )
}
