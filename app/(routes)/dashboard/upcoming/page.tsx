'use client'

import { useMemo } from 'react'
import { istNow } from '@/lib/wealth/calc'
import { BackBar } from '@/components/shell/BackBar'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { DUE_GROUPS, buildUpcoming, dueGroup } from '@/lib/wealth/upcoming'
import { UpcomingRow } from '@/components/wealth/UpcomingRow'
import { Empty, LoadingBlock } from '@/components/wealth/kit'
import { Money } from '@/components/wealth/Money'

/** Everything coming up to be paid, grouped by how soon: overdue, today, the next 7 days, later this month, later. */
export default function UpcomingPage() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const { ready, data } = useWealth()
  const { isEnabled } = useFeatures()
  const today = useMemo(() => istNow(), [])
  const items = useMemo(() => {
    if (!ready) return []
    const subs = (data.meta.find((x: any) => x.key === 'subscriptions')?.value ?? []) as any[]
    return buildUpcoming({ cards: isEnabled('credit_cards') ? data.cards : [], policies: isEnabled('insurance') ? data.policies : [], sips: isEnabled('mutual_funds') ? data.sips : [], funds: data.funds, subs, today })
  }, [ready, data, isEnabled, today])
  if (!ready) return <LoadingBlock className="h-64" />

  const groups = DUE_GROUPS.map((g) => ({ g, list: items.filter((x: any) => dueGroup(x.date, today) === g) })).filter((x) => x.list.length > 0)
  const total = items.reduce((n: number, x: any) => n + (Number(x.amount) || 0), 0)
  return (
    <div className="space-y-5">
      <BackBar fallback="/dashboard" />
      {items.length === 0 ? <Empty title="Nothing coming up" description="Card bills, insurance premiums, SIPs and recurring payments show here once they are set up." /> : (
        <>
          <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? 'payment' : 'payments'} coming up</span>
            <span className="text-base font-semibold tabular-nums text-expense"><Money value={total} /></span>
          </div>
          {groups.map(({ g, list }) => (
            <section key={g} aria-label={g}>
              <h2 className="mb-1 text-base font-semibold">{g}</h2>
              <ul className="divide-y divide-border">
                {list.map((x: any) => <li key={`${x.kind}-${x.id}`}><UpcomingRow item={x} today={today} /></li>)}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
