'use client'

import { useMemo } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { growthVs, portfolioSummary } from '@/lib/wealth/calc'
import { coverageTotals } from '@/lib/wealth/selectors'

/** My own shareable summary, worked out on this device from my records. What others see of it is decided by the sharing settings. */
export function useMySharedSummary() {
  const { data, netWorth } = useWealth()
  return useMemo(() => {
    const today = new Date()
    const g = growthVs(data.snapshots, netWorth.netWorth, 1, today)
    const cover = coverageTotals(data.policies, today)
    return {
      assets: netWorth.assets, liabilities: netWorth.liabilities, netWorth: netWorth.netWorth, growthPct: g?.pct ?? null,
      bank: data.bankAccounts.reduce((s: number, b: any) => s + b.currentBalance, 0),
      mutualFunds: portfolioSummary(data.funds, data.fundTxns, data.sips, today).value, insuranceCover: cover.total,
      joint: data.bankAccounts.filter((b: any) => b.type === 'joint').map((b: any) => ({ key: `acct:${b.accountNumber}`, value: b.currentBalance })),
    }
  }, [data, netWorth])
}
