'use client'

import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { RefreshProvider, useRefreshHandler } from '@/contexts/RefreshContext'

function PullToRefreshMain({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const onRefresh = useRefreshHandler()
  return (
    <PullToRefresh onRefresh={onRefresh} className={className}>
      {children}
    </PullToRefresh>
  )
}

export function DashboardRefreshShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <RefreshProvider>
      <PullToRefreshMain className={className}>{children}</PullToRefreshMain>
    </RefreshProvider>
  )
}
