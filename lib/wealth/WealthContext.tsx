'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { liveQuery } from 'dexie'
import { useAuth } from '@/lib/hooks/useAuth'
import { openWealthDB, TABLES } from './db'
import { seedDemo, DEMO_SEED_VERSION } from './seedDemo'
import { computeNetWorth } from './calc'
import { upsertSnapshot } from './actions'
import { setDefaultDateStyle } from './format'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rows = any[]
export interface WealthData {
  bankAccounts: Rows; balanceHistory: Rows; bankTxns: Rows; funds: Rows; fundTxns: Rows; sips: Rows
  assets: Rows; liabilities: Rows; cards: Rows; debitCards: Rows; transfers: Rows; automations: Rows; automationRuns: Rows; goals: Rows; cardStatements: Rows; cardPayments: Rows
  policies: Rows; premiums: Rows; expenses: Rows; budgets: Rows; members: Rows; vaultItems: Rows
  documents: Rows; legacy: Rows; snapshots: Rows; meta: Rows
}

interface WealthContextValue {
  ready: boolean
  isDemo: boolean
  profileId: string | null
  db: any
  data: WealthData
  netWorth: ReturnType<typeof computeNetWorth>
  resetDemo: () => Promise<void>
}

const empty = Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as WealthData
const Ctx = createContext<WealthContextValue | null>(null)

export function WealthProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth() as { user: any; loading: boolean }
  const profileId: string | null = user ? (user.demo ? 'demo' : user.id) : null
  const [data, setData] = useState<WealthData>(empty)
  const [ready, setReady] = useState(false)
  const db = useMemo(() => (profileId ? openWealthDB(profileId) : null), [profileId])

  useEffect(() => {
    if (!db || !profileId) {
      setReady(false)
      setData(empty)
      return
    }
    let sub: { unsubscribe: () => void } | null = null
    let cancelled = false
    ;(async () => {
      if (profileId === 'demo') {
        const seeded = await db.meta.get('seeded')
        const ver = await db.meta.get('seedVersion')
        // reseed when the demo dataset schema changed (e.g. cash account + debit cards were added)
        if (!seeded || ver?.value !== DEMO_SEED_VERSION) await seedDemo(db)
      }
      if (cancelled) return
      // One live query per table: a write only refreshes the table(s) it touched, instead of re-reading everything.
      // The first emission of every table is batched into a single state update so startup renders once.
      const subs: { unsubscribe: () => void }[] = []
      const initial: Record<string, unknown[]> = {}
      let pending = TABLES.length
      for (const t of TABLES) {
        let first = true
        subs.push(
          liveQuery(() => db[t].toArray()).subscribe({
            next: (rows: unknown[]) => {
              if (first) {
                first = false
                initial[t] = rows
                if (--pending === 0) {
                  setData((prev) => ({ ...prev, ...initial }))
                  setReady(true)
                }
              } else {
                setData((prev) => ({ ...prev, [t]: rows }))
              }
            },
            error: (e: unknown) => console.error('wealth db', t, e),
          })
        )
      }
      sub = { unsubscribe: () => subs.forEach((x) => x.unsubscribe()) }
    })()
    return () => {
      cancelled = true
      sub?.unsubscribe()
    }
  }, [db, profileId])

  const prefs = data.meta.find((m: any) => m.key === 'prefs')?.value
  setDefaultDateStyle(prefs?.dateFormat)

  const netWorth = useMemo(
    () =>
      computeNetWorth({
        banks: data.bankAccounts,
        funds: data.funds,
        assets: data.assets,
        cards: data.cards,
        liabilities: data.liabilities,
      }),
    [data.bankAccounts, data.funds, data.assets, data.cards, data.liabilities]
  )

  // Net worth auto-updates: keep the current month's snapshot in sync with underlying data.
  useEffect(() => {
    if (!db || !ready) return
    if (netWorth.assets === 0 && netWorth.liabilities === 0 && data.snapshots.length === 0) return
    upsertSnapshot(db, netWorth).catch(() => {})
  }, [db, ready, netWorth, data.snapshots.length])

  // Digital Legacy heartbeat: opening the app counts as activity (real accounts only; throttled to once per 30 min)
  useEffect(() => {
    if (!profileId || profileId === 'demo') return
    try {
      const k = 'mm-heartbeat'
      if (Date.now() - Number(localStorage.getItem(k) || 0) < 30 * 60_000) return
      localStorage.setItem(k, String(Date.now()))
    } catch { /* ignore */ }
    fetch('/api/legacy-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'heartbeat' }) }).catch(() => {})
  }, [profileId])

  const value = useMemo<WealthContextValue>(
    () => ({
      ready: ready && !loading,
      isDemo: profileId === 'demo',
      profileId,
      db,
      data,
      netWorth,
      resetDemo: async () => {
        if (profileId !== 'demo' || !db) return
        await seedDemo(db)
      },
    }),
    [ready, loading, profileId, db, data, netWorth]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWealth(): WealthContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWealth must be used inside <WealthProvider>')
  return v
}
