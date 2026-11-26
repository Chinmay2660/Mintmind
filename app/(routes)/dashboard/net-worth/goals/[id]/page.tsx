'use client'

import { useParams } from 'next/navigation'
import { GoalsPanel } from '@/components/wealth/GoalsPanel'

/** One goal on its own page. */
export default function GoalPage() {
  const { id } = useParams<{ id: string }>()
  return <GoalsPanel selectedId={id} />
}
