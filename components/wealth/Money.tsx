'use client'

import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { formatCompactINR, formatINR, MASK } from '@/lib/wealth/format'
import { cn } from '@/lib/utils'

interface MoneyProps {
  value: number | null | undefined
  compact?: boolean
  decimals?: boolean
  /** colour by sign (green positive / red negative) */
  signed?: boolean
  className?: string
}

/** Single place amounts are rendered: Indian grouping + hide/show balances. */
export function Money({ value, compact, decimals, signed, className }: MoneyProps) {
  const { privacyMode } = usePrivacyMode()
  const v = Number(value) || 0
  const text = privacyMode ? MASK : compact ? formatCompactINR(v) : formatINR(v, { decimals })
  return (
    <span
      className={cn('tabular-nums', signed && v > 0 && 'text-success', signed && v < 0 && 'text-destructive', className)}
      aria-label={privacyMode ? 'Hidden amount' : undefined}
    >
      {text}
    </span>
  )
}
