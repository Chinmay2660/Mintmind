'use client'

import { Eye, EyeOff } from 'lucide-react'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { Button } from '@/components/ui/button'
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={togglePrivacyMode}
        className={cn('h-9 w-9 rounded-full', showLabel && 'w-auto px-3', className)}
        aria-label={label}
        aria-pressed={privacyMode}
      >
        {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {showLabel && <span className="ml-2 hidden sm:inline">{label}</span>}
      </Button>
    </Tooltip>
  )
}
