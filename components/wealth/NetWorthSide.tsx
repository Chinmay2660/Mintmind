'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { netWorthGroups } from '@/lib/wealth/netWorthGroups'
import { coverageTotals } from '@/lib/wealth/selectors'
import { toISO, istNow } from '@/lib/wealth/calc'
import { ASSET_LABELS } from '@/lib/wealth/labels'
import { Money } from './Money'
import { Metric, Empty, LoadingBlock } from './kit'
import { SummaryHeader } from './HoldingUI'

/** One side of net worth: everything you own, or everything you owe, as groups that open their own page. */
export function NetWorthSide({ side }: { side: 'assets' | 'liabilities' }) {
  const { ready, data, netWorth } = useWealth()
  const { isEnabled } = useFeatures()
  const today = useMemo(() => istNow(), [])
  const groups = useMemo(() => {
    if (!ready) return null
    const cover = coverageTotals(data.policies, today)
    const g = netWorthGroups({ assetBreakdown: netWorth.assetBreakdown as any, bankAccounts: data.bankAccounts, cards: data.cards, liabilities: data.liabilities, cover: isEnabled('insurance') ? cover.total : 0, coverCount: cover.activeCount, funds: data.funds, balanceHistory: data.balanceHistory, expenses: data.expenses, cardPayments: data.cardPayments, todayIso: toISO(today), policies: data.policies.filter((p: any) => !p.endDate || p.endDate >= toISO(today)), labels: ASSET_LABELS as any })
    return (side === 'assets' ? g.assets : g.liabilities).filter((x: any) => x.key !== 'banks' || isEnabled('bank_accounts')).filter((x: any) => x.key !== 'cards' || isEnabled('credit_cards'))
  }, [ready, data, netWorth, today, side, isEnabled])
  if (!groups) return <LoadingBlock className="h-64" />
  const total = side === 'assets' ? netWorth.assets : netWorth.liabilities
  if (groups.length === 0) return <Empty title={side === 'assets' ? 'No assets yet' : 'No liabilities'} description={side === 'assets' ? 'Add a bank account or mutual fund to start building your net worth.' : 'Loans and card balances you owe will show here.'} />
  return (
    <div className="space-y-5">
      <SummaryHeader label={side === 'assets' ? 'Total assets' : 'Total liabilities'} value={<Money value={total} />}
        stats={groups.slice(0, 3).map((g: any) => ({ label: g.label, value: <Money value={g.value} compact /> }))} />
      {groups.map((g: any) => (
        <section key={g.key} aria-label={g.label}>
          <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
            <h3 className="text-base font-semibold">{g.label}</h3>
            <span className="text-sm font-semibold tabular-nums"><Money value={g.value} /></span>
          </div>
          <ul className="divide-y divide-border">
            {(g.children.length ? g.children : [{ key: g.key, label: g.label, value: g.value, href: g.href }]).map((r: any) => (
              <li key={`${g.key}-${r.key}`}>
                <Link href={r.href || g.href} className="flex min-h-14 items-center gap-3 py-2 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{r.label}</span>{r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}</span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums"><Money value={r.value} /></span>
                    {r.dayChange != null && <Metric amount={r.dayChange} pct={r.dayPct} invertGood={!!r.inverted} className="text-xs" />}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
