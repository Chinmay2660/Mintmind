'use client'

import { AssetsLoans } from '@/components/wealth/AssetsLoans'
import { useWealth } from '@/lib/wealth/WealthContext'
import { LoadingBlock } from '@/components/wealth/kit'

export default function AssetsPage() {
  const { ready } = useWealth()
  if (!ready) return <LoadingBlock className="h-64" />
  return (
    <div className="space-y-5">
      <AssetsLoans view="assets" />
    </div>
  )
}
