'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { Calendar, Target, PiggyBank } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { TabButtonGroup } from '@/components/ui/tab-button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useRegisterRefresh } from '@/contexts/RefreshContext'

const BudgetsPageContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      router.replace('/dashboard/budgets/new')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (user) {
      fetchBudgets()
    }
  }, [user, selectedPeriod])

  const fetchBudgets = async () => {
    try {
      setLoading(true)
      const response = await request.get(`/api/budgets?period=${selectedPeriod}`)
      setBudgets(response.data)
    } catch (error) {
      toast.error('Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }

  useRegisterRefresh(fetchBudgets)

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Budget',
      description: 'Are you sure you want to delete this budget?',
      onConfirm: async () => {
        await request.delete(`/api/budgets/${id}`)
        toast.success('Budget deleted successfully')
        fetchBudgets()
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
      <PageHeader title="Budgets" subtitle="Manage your spending limits" showBack>
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
          budgets.map((budget, index) => (
            <SwipeableRow
              key={budget._id}
              onEdit={() => router.push(`/dashboard/budgets/${budget._id}`)}
              onDelete={() => handleDelete(budget._id)}
            >
              <Card delay={0.2 + index * 0.05} hover={true} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{budget.categoryId?.icon || '📁'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base mb-1">{budget.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {budget.categoryId?.name || 'Uncategorized'} • {budget.period}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground">
                        {formatCurrency(budget.amount)}
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
                  <DesktopRowActions>
                    <EditButton onClick={() => router.push(`/dashboard/budgets/${budget._id}`)} />
                    <DeleteButton onClick={() => handleDelete(budget._id)} />
                  </DesktopRowActions>
                </div>
              </Card>
            </SwipeableRow>
          ))
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
