'use client'

import { useEffect, useRef } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { pricesDue, refreshNavs } from '@/lib/market/client'

/** Renders nothing. Once a week, when the app is opened, refreshes fund NAVs from the shared price cache. */
export function PriceRefresher() {
  const { ready, data, db, isDemo } = useWealth()
  const ran = useRef(false)
  useEffect(() => {
    if (!ready || isDemo || ran.current || !data.funds.length || !pricesDue()) return
    ran.current = true
    refreshNavs(db, data.funds).catch(() => { ran.current = false })
  }, [ready, isDemo, data.funds, db])
  return null
}
