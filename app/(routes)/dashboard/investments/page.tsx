'use client'
import React, { Suspense, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterButtonGroup } from '@/components/ui/filter-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect } from '@/lib/hooks/useAddActionRedirect'

const InvestmentsPageContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const { data: allInvestments, loading, reload } = useLocalList('investments', userId)
  const [filterType, setFilterType] = useState('all')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()

  const investments =
    filterType === 'all'
      ? allInvestments
      : allInvestments.filter((inv) => inv.type === filterType)

  useSyncedRefresh(reload)
  useAddActionRedirect('/dashboard/investments/new')

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Investment',
      description: 'Are you sure you want to delete this investment?',
      onConfirm: async () => {
        await request.delete(`/api/investments/${id}`)
        toast.success('Investment deleted successfully')
        await reload()
      },
    })
  }

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const totalCurrentValue = investments.reduce(
    (sum, inv) => sum + (inv.currentValue || inv.amount || 0),
    0
  )
  const totalGain = totalCurrentValue - totalInvested

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader
        title="Investments"
        subtitle="Track your investment portfolio"
      >
        <div className="hidden md:block">
          <AddButton onClick={() => router.push('/dashboard/investments/new')}>
            Add Investment
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={() => router.push('/dashboard/investments/new')} label="Add investment" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Total Invested</p>
          <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Current Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</p>
        </div>
        <div
          className={`rounded-xl p-5 text-white shadow-lg ${
            totalGain >= 0
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-red-600'
          }`}
        >
          <p className="text-white/80 text-sm mb-1">Total Gain/Loss</p>
          <p className="text-2xl font-bold">
            {totalGain >= 0 ? '+' : ''}
            {formatCurrency(totalGain)}
          </p>
        </div>
      </div>

      <FilterButtonGroup
        value={filterType}
        onValueChange={setFilterType}
        options={[
          { value: 'all', label: 'All' },
          { value: 'Mutual Fund', label: 'Mutual Funds' },
          { value: 'FD', label: 'Fixed Deposits' },
          { value: 'Stock', label: 'Stocks' },
          { value: 'Gold', label: 'Gold' },
          { value: 'Gold ETF', label: 'Gold ETF' },
          { value: 'EPF', label: 'EPF' },
          { value: 'EPS', label: 'EPS' },
        ]}
        className="flex-wrap"
      />

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="skeleton h-5 w-32 mb-2"></div>
                  <div className="skeleton h-4 w-24"></div>
                </div>
                <div className="skeleton h-6 w-16"></div>
              </div>
              <div className="skeleton h-8 w-40"></div>
            </div>
          ))
        ) : investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investments yet"
            description="Add your first investment to get started"
            actionLabel="Add Your First Investment"
            onAction={() => router.push('/dashboard/investments/new')}
          />
        ) : (
          investments.map((investment) => {
            const gain = (investment.currentValue || investment.amount) - investment.amount
            const gainPercent = investment.amount > 0 ? (gain / investment.amount) * 100 : 0

            return (
                <Card key={investment._id} delay={0.1} hover={true} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {investment.name}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                          {investment.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Invested: {format(new Date(investment.investedDate), 'MMM dd, yyyy')}
                      </p>
                      {investment.maturityDate && (
                        <p className="text-sm text-muted-foreground">
                          Maturity: {format(new Date(investment.maturityDate), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <RowActions>
                      <EditButton
                        onClick={() => router.push(`/dashboard/investments/${investment._id}`)}
                      />
                      <DeleteButton onClick={() => handleDelete(investment._id)} />
                    </RowActions>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Invested</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(investment.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(investment.currentValue || investment.amount)}
                      </p>
                    </div>
                  </div>
                  {investment.currentValue && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Gain/Loss</span>
                        <span
                          className={`text-sm font-semibold ${
                            gain >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {gain >= 0 ? '+' : ''}
                          {formatCurrency(gain)} ({gainPercent >= 0 ? '+' : ''}
                          {gainPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  )}
                  {investment.interestRate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Interest Rate: {investment.interestRate}%
                    </p>
                  )}
                  {investment.maturityType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Maturity Type: {investment.maturityType}
                    </p>
                  )}
                </Card>
            )
          })
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function InvestmentsPage() {
  return (
    <Suspense fallback={null}>
      <InvestmentsPageContent />
    </Suspense>
  )
}
