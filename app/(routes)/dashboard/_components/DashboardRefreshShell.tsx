'use client'

import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { RefreshProvider, useRefreshHandler } from '@/contexts/RefreshContext'

function PullToRefreshMain({ children }: { children: React.ReactNode }) {
  const onRefresh = useRefreshHandler()
  return <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>
}

export function DashboardRefreshShell({ children }: { children: React.ReactNode }) {
  return (
    <RefreshProvider>
      <PullToRefreshMain>{children}</PullToRefreshMain>
    </RefreshProvider>
  )
}
