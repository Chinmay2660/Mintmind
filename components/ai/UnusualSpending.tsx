'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { unusualSpending } from '@/lib/ai/anomalies'
import { useAi } from './useAi'
import { formatDate, formatINR } from '@/lib/wealth/format'

/** Large one-off expenses and likely double charges from the last 30 days. Worked out on this device from your own entries. */
export function UnusualSpending() {
  const { data } = useAi()
  const list = useMemo(() => unusualSpending(data.expenses || []), [data.expenses])
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Unusual spending, last 30 days</h3>
      {list.length === 0 ? <p className="text-sm text-muted-foreground">Nothing unusual spotted. This needs a few months of entries per category to compare against.</p> : (
        <ul className="divide-y divide-border rounded-xl border border-border">{list.map((x) => (
          <li key={`${x.kind}-${x.id}`} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
            <div><p className="font-medium">{x.kind === 'large' ? `${formatINR(x.amount)} on ${x.category} is ${x.times}× your usual` : `Possible double charge: ${formatINR(x.amount)} on ${x.category}, ${x.count} times`}</p>
              <p className="text-xs text-muted-foreground">{formatDate(x.date)}{x.note ? ` · ${x.note}` : ''}{x.kind === 'large' ? ` · usual about ${formatINR(x.typical)}` : ''}</p></div>
            <Link href="/dashboard/budget" className="shrink-0 text-xs font-medium text-primary hover:underline">Review</Link>
          </li>))}</ul>
      )}
    </div>
  )
}
