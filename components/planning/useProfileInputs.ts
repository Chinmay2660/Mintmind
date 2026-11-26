'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { assetValue } from '@/lib/wealth/holdings'
import { availableBalance, computeNetWorth, monthlyEquivalent, toISO, istNow } from '@/lib/wealth/calc'

const KEY = 'planInputs' // a row of the synced `meta` table, so it follows the user to every device
export type Inputs = { takeHome: string; spend: string; essentials: string; age: string; retireAge: string }

const sum = (rows: any[] = [], f: (r: any) => number) => rows.reduce((s, r) => s + (f(r) || 0), 0)

/** Editable "about you" numbers, prefilled from the user's own data and saved with the rest of the user's data. */
export function useProfileInputs(data: any) {
  const budget = data.budgets?.find((b: any) => b.id === toISO(istNow()).slice(0, 7))?.total || 0
  const [v, setV] = useState<Inputs>({ takeHome: '', spend: budget ? String(Math.round(budget)) : '', essentials: '', age: '30', retireAge: '60' })
  const { db } = useWealth()
  const stored = data.meta?.find((m: any) => m.key === KEY)?.value
  const written = useRef('')
  // take in what is saved (including changes made on another device), but never overwrite what was just typed here
  useEffect(() => {
    if (!stored) return
    const json = JSON.stringify(stored)
    if (json !== written.current) setV((p) => ({ ...p, ...stored }))
  }, [stored])
  const set = (k: keyof Inputs, val: string) => setV((p) => {
    const n = { ...p, [k]: val }
    written.current = JSON.stringify(n)
    db?.meta.put({ key: KEY, value: n }).catch(() => {})
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
