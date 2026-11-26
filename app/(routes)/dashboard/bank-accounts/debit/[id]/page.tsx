'use client'

import { useParams } from 'next/navigation'
import { DebitCardsTab } from '@/components/wealth/DebitCards'

/** One debit card on its own page. */
export default function DebitCardPage() {
  const { id } = useParams<{ id: string }>()
  return <DebitCardsTab selectedId={id} />
}
