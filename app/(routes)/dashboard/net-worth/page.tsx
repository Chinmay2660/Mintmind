'use client'

import { TabBar } from '@/components/ui/tab-bar'
import { useEffect, useState } from 'react'
import { GoalsPanel } from '@/components/wealth/GoalsPanel'
import { ForecastPanel } from '@/components/wealth/ForecastPanel'

// The Overview already shows net worth, assets and liabilities, so this page is only what looks ahead
type NwTab = 'Goals' | 'Forecast'
const NW_TABS: NwTab[] = ['Goals', 'Forecast']

export default function NetWorthPage() {
  const [tab, setTab] = useState<NwTab>('Goals')
  // a link like ?add=goal lands on the Goals tab (set after mount, so the server and browser render the same first paint)
  useEffect(() => { if (new URLSearchParams(window.location.search).get('add') === 'goal') setTab('Goals') }, [])
  return (
    <div className="space-y-5">
      <TabBar label="Goals and forecast" tabs={NW_TABS.map((t) => ({ key: t, label: t }))} value={tab} onChange={(k) => setTab(k as NwTab)} />
      {tab === 'Goals' ? <GoalsPanel /> : <ForecastPanel />}
    </div>
  )
}
