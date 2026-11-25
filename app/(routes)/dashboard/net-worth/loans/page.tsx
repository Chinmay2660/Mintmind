'use client'

import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { AssetsLoans } from '@/components/wealth/AssetsLoans'
import { useWealth } from '@/lib/wealth/WealthContext'
import { LoadingBlock } from '@/components/wealth/kit'

export default function LoansPage() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const { ready } = useWealth()
  if (!ready) return <LoadingBlock className="h-64" />
  return (
    <div className="space-y-5">
      <AssetsLoans view="loans" />
    </div>
  )
}
