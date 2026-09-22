'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { useAuth } from '@/lib/hooks/useAuth'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FinanceStatCard } from '@/components/ui/finance-stat-card'
import { formatCurrency } from '@/lib/utils/format'

interface Investment {
  _id: string
  name: string
  type: string
  amount: number
  currentValue?: number
  investedDate: string
  schemeCode?: string
  units?: number
  currentNav?: number
  navDate?: string
}

function MutualFundsContent() {
  const { user } = useAuth()
  const { data: allInvestments, loading, reload } = useLocalList<Investment>('investments', user?.id)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const funds = useMemo(
    () => allInvestments.filter((inv) => inv.type === 'Mutual Fund'),
    [allInvestments]
  )

  useSyncedRefresh(reload)

  const totalInvested = funds.reduce((sum, f) => sum + (f.amount || 0), 0)
  const totalCurrent = funds.reduce((sum, f) => sum + (f.currentValue || f.amount || 0), 0)
  const totalGain = totalCurrent - totalInvested

  const handleRefreshNav = async (fund: Investment) => {
    if (!fund.schemeCode) return
    setRefreshingId(fund._id)
    try {
      const res = await request.get(`/api/mfapi/${fund.schemeCode}`)
      const navData = res.data
      if (!navData?.nav) {
        toast.error('Could not fetch NAV')
        return
      }
      const currentValue = fund.units ? fund.units * navData.nav : fund.currentValue || fund.amount
      await request.put(`/api/investments/${fund._id}`, {
        currentNav: navData.nav,
        navDate: navData.navDate,
        currentValue,
      })
      toast.success(`NAV updated: ${navData.nav}`)
      await reload()
    } catch {
      toast.error('Failed to refresh NAV')
    } finally {
      setRefreshingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mutual Funds"
        subtitle="Track your mutual fund holdings"
        showBack
        backHref="/dashboard/investments"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FinanceStatCard title="Total Invested" value={totalInvested} loading={loading} />
        <FinanceStatCard
          title="Current Value"
          value={totalCurrent}
          variant="success"
          loading={loading}
        />
        <FinanceStatCard
          title="Total P/L"
          value={totalGain}
          variant={totalGain >= 0 ? 'success' : 'danger'}
          loading={loading}
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card animate-pulse p-5">
              <div className="skeleton mb-2 h-5 w-40" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : funds.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No mutual funds yet"
            description="Add a mutual fund investment to get started"
            actionLabel="Add Investment"
            onAction={() => window.location.href = '/dashboard/investments/new'}
          />
        ) : (
          funds.map((fund) => {
            const current = fund.currentValue || fund.amount
            const gain = current - fund.amount
            const gainPct = fund.amount > 0 ? (gain / fund.amount) * 100 : 0

            return (
              <Card key={fund._id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/investments/${fund._id}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {fund.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Invested {format(new Date(fund.investedDate), 'MMM dd, yyyy')}
                      {fund.schemeCode && ` · Scheme ${fund.schemeCode}`}
                    </p>
                  </div>
                  {fund.schemeCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshNav(fund)}
                      disabled={refreshingId === fund._id}
                    >
                      <RefreshCw
                        className={`mr-1.5 h-3.5 w-3.5 ${refreshingId === fund._id ? 'animate-spin' : ''}`}
                      />
                      Refresh NAV
                    </Button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Invested</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(fund.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Value</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(current)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">P/L</p>
                    <p
                      className={`font-semibold tabular-nums ${
                        gain >= 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {gain >= 0 ? '+' : ''}
                      {formatCurrency(gain)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Return</p>
                    <p
                      className={`font-semibold tabular-nums ${
                        gainPct >= 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {gainPct >= 0 ? '+' : ''}
                      {gainPct.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {fund.currentNav && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Latest NAV: {fund.currentNav}
                    {fund.navDate && ` (${fund.navDate})`}
                  </p>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function MutualFundsPage() {
  return (
    <Suspense fallback={null}>
      <MutualFundsContent />
    </Suspense>
  )
}
