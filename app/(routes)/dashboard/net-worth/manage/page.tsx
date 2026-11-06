'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AssetsLoans } from '@/components/wealth/AssetsLoans'
import { useWealth } from '@/lib/wealth/WealthContext'
import { LoadingBlock, PageHeader } from '@/components/wealth/kit'

export default function ManageAssetsLoansPage() {
  const { ready } = useWealth()
  if (!ready) return <LoadingBlock className="h-64" />
  return (
    <div className="space-y-5">
      <Link href="/dashboard/net-worth" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Net worth</Link>
      <PageHeader title="Assets & loans" description="What you own and what you owe. Net worth is worked out from these." />
      <AssetsLoans />
    </div>
  )
}
