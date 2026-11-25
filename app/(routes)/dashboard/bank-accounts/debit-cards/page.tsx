'use client'

import { BackBar } from '@/components/shell/BackBar'
import { DebitCardsTab } from '@/components/wealth/DebitCards'

/** Debit cards, on a page of their own (they are also a tab on Bank accounts). They spend from a bank account and hold no money or debt of their own. */
export default function DebitCardsPage() {
  return (
    <div className="space-y-5">
      <BackBar fallback="/dashboard/bank-accounts" />
      <DebitCardsTab />
    </div>
  )
}
