'use client'

import { useEffect, useMemo, useState } from 'react'
import { assetValue } from '@/lib/wealth/holdings'
import { availableBalance, computeNetWorth, monthlyEquivalent, toISO } from '@/lib/wealth/calc'

const KEY = 'mm-plan-inputs'
export type Inputs = { takeHome: string; spend: string; essentials: string; age: string; retireAge: string }

const sum = (rows: any[] = [], f: (r: any) => number) => rows.reduce((s, r) => s + (f(r) || 0), 0)

/** Editable "about you" numbers, prefilled from the user's own data and remembered in this browser. */
export function useProfileInputs(data: any) {
  const budget = data.budgets?.find((b: any) => b.id === toISO(new Date()).slice(0, 7))?.total || 0
  const [v, setV] = useState<Inputs>({ takeHome: '', spend: budget ? String(Math.round(budget)) : '', essentials: '', age: '30', retireAge: '60' })
  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setV((p) => ({ ...p, ...JSON.parse(s) })) } catch { /* ignore */ }
  }, [])
  const set = (k: keyof Inputs, val: string) => setV((p) => {
    const n = { ...p, [k]: val }
    try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* ignore */ }
    return n
  })

  const derived = useMemo(() => {
    const nw = computeNetWorth({ banks: data.bankAccounts, funds: data.funds, assets: data.assets, cards: data.cards, liabilities: data.liabilities })
    const pol = (t: string[]) => sum((data.policies || []).filter((p: any) => t.includes(p.type)), (p) => Number(p.sumAssured))
    return {
      netWorth: nw.netWorth,
      liquid: sum(data.bankAccounts, availableBalance),
      loans: (data.liabilities || []).filter((l: any) => Number(l.outstanding) > 0).map((l: any) => ({ balance: Number(l.outstanding), ratePct: Number(l.rate) || 0, emi: Number(l.emi) || 0 })),
      termCover: pol(['term', 'life']), healthCover: pol(['health']),
      monthlyInvest: sum(data.sips, (s) => monthlyEquivalent(s).monthly),
      retirementSavings: sum(data.assets?.filter((a: any) => ['epf', 'ppf', 'nps'].includes(a.category)), (a) => assetValue(a)) + sum(data.funds, (f) => Number(f.currentValue)),
    }
  }, [data])
  return { v, set, derived }
}
