'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { Shield, AlertTriangle } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { format, differenceInDays, isPast } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterButtonGroup } from '@/components/ui/filter-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'

const FREQUENCY_MULTIPLIER: Record<string, number> = {
  Monthly: 12,
  Quarterly: 4,
  Yearly: 1,
}

const InsurancePageContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      router.replace('/dashboard/insurance/new')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (user) fetchPolicies()
  }, [user, filterType])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const params = filterType !== 'all' ? { type: filterType } : {}
      const response = await request.get('/api/insurance', { params })
      setPolicies(response.data)
    } catch {
      toast.error('Failed to load insurance policies')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Policy',
      description: 'Are you sure you want to delete this insurance policy?',
      onConfirm: async () => {
        await request.delete(`/api/insurance/${id}`)
        toast.success('Policy deleted')
        fetchPolicies()
      },
    })
  }

  const activePolicies = policies.filter((p) => p.isActive !== false)
  const annualPremium = activePolicies.reduce((sum, p) => {
    const mult = FREQUENCY_MULTIPLIER[p.premiumFrequency] || 1
    return sum + (p.premium || 0) * mult
  }, 0)
  const totalCoverage = activePolicies.reduce((sum, p) => sum + (p.coverageAmount || 0), 0)
  const renewingSoon = activePolicies.filter((p) => {
    if (!p.renewalDate) return false
    const days = differenceInDays(new Date(p.renewalDate), new Date())
    return days >= 0 && days <= 30
  }).length

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader title="Insurance" subtitle="Track your insurance policies">
        <div className="hidden md:block">
          <AddButton onClick={() => router.push('/dashboard/insurance/new')}>
            Add Policy
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={() => router.push('/dashboard/insurance/new')} label="Add policy" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Active Policies</p>
          <p className="text-2xl font-bold">{activePolicies.length}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Annual Premium</p>
          <p className="text-2xl font-bold">{formatCurrency(annualPremium)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Total Coverage</p>
          <p className="text-2xl font-bold">{formatCurrency(totalCoverage)}</p>
        </div>
      </div>

      {renewingSoon > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {renewingSoon} {renewingSoon === 1 ? 'policy renews' : 'policies renew'} within 30 days
        </div>
      )}

      <FilterButtonGroup
        value={filterType}
        onValueChange={setFilterType}
        options={[
          { value: 'all', label: 'All' },
          { value: 'Life', label: 'Life' },
          { value: 'Health', label: 'Health' },
          { value: 'Motor', label: 'Motor' },
          { value: 'Home', label: 'Home' },
        ]}
        className="flex-wrap"
      />

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : policies.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No insurance policies yet"
            description="Add your first policy to track premiums and renewals"
            actionLabel="Add Your First Policy"
            onAction={() => router.push('/dashboard/insurance/new')}
          />
        ) : (
          policies.map((policy) => {
            const renewalSoon =
              policy.renewalDate &&
              differenceInDays(new Date(policy.renewalDate), new Date()) <= 30 &&
              differenceInDays(new Date(policy.renewalDate), new Date()) >= 0
            const renewalPast = policy.renewalDate && isPast(new Date(policy.renewalDate))

            return (
              <SwipeableRow
                key={policy._id}
                onEdit={() => router.push(`/dashboard/insurance/${policy._id}`)}
                onDelete={() => handleDelete(policy._id)}
              >
                <Card delay={0.1} hover className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{policy.name}</h3>
                        <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                          {policy.type}
                        </span>
                        {policy.isActive === false && (
                          <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded">
                            Inactive
                          </span>
                        )}
                        {renewalSoon && (
                          <span className="px-2 py-1 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
                            Renewing soon
                          </span>
                        )}
                        {renewalPast && policy.isActive !== false && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 rounded">
                            Renewal overdue
                          </span>
                        )}
                      </div>
                      {policy.policyNumber && (
                        <p className="text-sm text-muted-foreground">#{policy.policyNumber}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Started: {format(new Date(policy.startDate), 'MMM dd, yyyy')}
                      </p>
                      {policy.renewalDate && (
                        <p className="text-sm text-muted-foreground">
                          Renewal: {format(new Date(policy.renewalDate), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <DesktopRowActions>
                      <EditButton onClick={() => router.push(`/dashboard/insurance/${policy._id}`)} />
                      <DeleteButton onClick={() => handleDelete(policy._id)} />
                    </DesktopRowActions>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Premium</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(policy.premium)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          / {policy.premiumFrequency?.toLowerCase()}
                        </span>
                      </p>
                    </div>
                    {policy.coverageAmount > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Coverage</p>
                        <p className="text-lg font-bold text-foreground">
                          {formatCurrency(policy.coverageAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </SwipeableRow>
            )
          })
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function InsurancePage() {
  return (
    <Suspense fallback={null}>
      <InsurancePageContent />
    </Suspense>
  )
}
