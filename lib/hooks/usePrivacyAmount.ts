'use client'

import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { formatCurrency, maskCurrency } from '@/lib/utils/format'

/** Format currency amounts; masks only when dashboard privacy mode is on. */
export function usePrivacyAmount() {
  const { privacyMode } = usePrivacyMode()

  const fmt = (
    amount: number | string | null | undefined,
    options?: { compact?: boolean }
  ) => (privacyMode ? maskCurrency(amount) : formatCurrency(amount, options))

  return { privacyMode, fmt }
}
