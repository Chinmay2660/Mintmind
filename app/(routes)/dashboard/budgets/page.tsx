'use client'
import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { Calendar, PiggyBank } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { TabButtonGroup } from '@/components/ui/tab-button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useOffline } from '@/contexts/OfflineContext'
import { computeBudgetStats } from '@/lib/offline/computed'
import { getUtilizationBarClass } from '@/lib/utils/utilization'
import { DEFAULT_CATEGORY_COLOR } from '@/lib/constants/colors'

type BudgetStat = {
  budgetId: string
  spent: number
  remaining: number
  percentage: number
  isOverBudget: boolean
  categoryColor?: string | null
}

const BudgetsPageContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const { syncing, lastSyncedAt } = useOffline()
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const { data: budgets, loading, reload } = useLocalList('budgets', userId, {
    period: selectedPeriod,
  })
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [budgetStatsById, setBudgetStatsById] = useState<Record<string, BudgetStat>>({})

  const loadBudgetStats = useCallback(async () => {
    const stats = await computeBudgetStats({ period: selectedPeriod })
    setBudgetStatsById(
      Object.fromEntries(
        stats.categories.map((item) => [
          item.budgetId,
          {
            budgetId: item.budgetId,
            spent: item.spent,
            remaining: item.remaining,
            percentage: item.percentage,
            isOverBudget: item.isOverBudget,
            categoryColor: item.categoryColor,
          },
        ])
      )
    )
  }, [selectedPeriod])

  useSyncedRefresh(async () => {
    await reload()
    await loadBudgetStats()
  })

  useEffect(() => {
    if (!userId || syncing) return
    loadBudgetStats()
  }, [userId, syncing, lastSyncedAt, loadBudgetStats])

  useAddActionRedirect('/dashboard/budgets/new')

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Budget',
      description: 'Are you sure you want to delete this budget?',
      onConfirm: async () => {
        await request.delete(`/api/budgets/${id}`)
        toast.success('Budget deleted successfully')
        await reload()
      },
    })
  }

  const periodOptions = [
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
  ]

  const isInitialLoad = loading && budgets.length === 0
  const isRefreshing = loading && budgets.length > 0

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <PageHeader title="Budgets" subtitle="Manage your spending limits">
        <div className="hidden md:block">
          <AddButton onClick={() => router.push('/dashboard/budgets/new')}>Add Budget</AddButton>
        </div>
      </PageHeader>

      <FAB onClick={() => router.push('/dashboard/budgets/new')} label="Add budget" />

      <div className="flex items-center gap-3 min-w-0">
        <TabButtonGroup
          value={selectedPeriod}
          onValueChange={setSelectedPeriod}
          options={periodOptions}
        />
      </div>

      <div className={cn('space-y-2 transition-opacity', isRefreshing && 'opacity-60 pointer-events-none')}>
        {isInitialLoad ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="skeleton-icon w-12 h-12"></div>
                  <div className="flex-1">
                    <div className="skeleton h-4 w-32 mb-2"></div>
                    <div className="skeleton h-3 w-24"></div>
                  </div>
                </div>
                <div className="skeleton h-6 w-20"></div>
              </div>
            </div>
          ))
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No budgets yet"
            description="Create your first budget to track spending"
            actionLabel="Create Your First Budget"
            onAction={() => router.push('/dashboard/budgets/new')}
          />
        ) : (
          budgets.map((budget, index) => {
            const stat = budgetStatsById[budget._id]
            const spent = stat?.spent ?? 0
            const remaining = stat?.remaining ?? budget.amount
            const utilization = stat?.percentage ?? 0
            const isOverBudget = stat?.isOverBudget ?? false
            const categoryColor =
              budget.categoryId?.color || stat?.categoryColor || DEFAULT_CATEGORY_COLOR

            return (
              <Card key={budget._id} delay={0.2 + index * 0.05} hover={true} className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                  >
                    <span className="text-2xl">{budget.categoryId?.icon || '📁'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base mb-1">{budget.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {budget.categoryId?.name || 'Uncategorized'} • {budget.period}
                    </p>

                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span className={isOverBudget ? 'text-red-500 font-medium' : ''}>
                          {formatCurrency(spent)} spent
                        </span>
                        <span>{formatCurrency(remaining)} left</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverBudget ? 'bg-red-500' : getUtilizationBarClass(utilization)
                          }`}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-foreground">
                        {formatCurrency(budget.amount)}
                      </span>
                      <span className="text-muted-foreground">
                        · {Math.round(utilization)}% used
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(budget.startDate).toLocaleDateString()} -{' '}
                        {new Date(budget.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <RowActions>
                    <EditButton onClick={() => router.push(`/dashboard/budgets/${budget._id}`)} />
                    <DeleteButton onClick={() => handleDelete(budget._id)} />
                  </RowActions>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function BudgetsPage() {
  return (
    <Suspense fallback={null}>
      <BudgetsPageContent />
    </Suspense>
  )
}
