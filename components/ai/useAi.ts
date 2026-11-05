'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useWealth } from '@/lib/wealth/WealthContext'
import { buildFacts } from '@/lib/ai/facts'
import { buildInsights, visibleInsights } from '@/lib/ai/insights'
import { healthScore } from '@/lib/ai/health'
import { buildReport } from '@/lib/ai/report'

/** One place that turns the user's data into facts, insights, health score and report. All deterministic. */
export function useAi() {
  const { ready, data, netWorth, isDemo, db } = useWealth()

  const facts = useMemo(
    () => (ready ? buildFacts({ ...data, netWorth }, new Date()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, data.bankAccounts, data.funds, data.fundTxns, data.sips, data.cards, data.policies, data.expenses, data.bankTxns, data.transfers, data.budgets, data.snapshots, data.members, netWorth]
  )
  const dismissed: Record<string, number> = data.meta.find((m: any) => m.key === 'aiDismissed')?.value ?? {}
  const profile = data.meta.find((m: any) => m.key === 'profile')?.value
  const all = useMemo(() => (facts ? buildInsights(facts) : []), [facts])
  const insights = useMemo(() => visibleInsights(all, dismissed), [all, dismissed])
  const health = useMemo(() => (facts ? healthScore(facts, { monthlyIncome: profile?.monthlyIncome || 0 }) : null), [facts, profile?.monthlyIncome])
  const report = useMemo(() => (facts && health ? buildReport(facts, health, insights) : null), [facts, health, insights])

  const dismiss = useCallback((id: string) => db.meta.put({ key: 'aiDismissed', value: { ...dismissed, [id]: Date.now() } }), [db, dismissed])
  const restore = useCallback(() => db.meta.put({ key: 'aiDismissed', value: {} }), [db])
  return { ready, isDemo, facts, data, insights, dismissedCount: all.length - insights.length, health, report, dismiss, restore }
}

export interface AiStatus { configured: boolean; provider: string | null; model: string | null; dailyLimit: number; today: null | { requests: number; failures: number; inputTokens: number; outputTokens: number; estimatedCost: number | null } }

/** Provider status (real accounts only) and the user's consent to send calculated facts to the provider. */
export function useAiProvider() {
  const { isDemo, ready, data, db } = useWealth()
  const [status, setStatus] = useState<AiStatus | null>(null)
  const refresh = useCallback(async () => {
    if (isDemo) return
    try { setStatus((await axios.get('/api/ai/usage')).data) } catch { setStatus({ configured: false, provider: null, model: null, dailyLimit: 0, today: null }) }
  }, [isDemo])
  useEffect(() => { if (ready) refresh() }, [ready, refresh])
  const consent = !!data.meta.find((m: any) => m.key === 'ai')?.value?.consent
  const setConsent = (v: boolean) => db.meta.put({ key: 'ai', value: { consent: v, at: new Date().toISOString() } })
  return { status, refresh, consent, setConsent, usable: !isDemo && !!status?.configured && consent }
}
