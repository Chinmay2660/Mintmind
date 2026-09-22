'use client'

import React, { Suspense, useState } from 'react'
import { Repeat } from 'lucide-react'
import { format } from 'date-fns'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterButtonGroup } from '@/components/ui/filter-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { SubscriptionForm } from './_components/SubscriptionForm'

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  active: 'success',
  paused: 'warning',
  cancelled: 'muted',
}

const SubscriptionsPageContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const { data: allSubscriptions, loading, reload } = useLocalList('subscriptions', userId)
  const [filterStatus, setFilterStatus] = useState('all')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, openSheet, closeSheet } = useFormSheet()

  const subscriptions =
    filterStatus === 'all'
      ? allSubscriptions
      : allSubscriptions.filter((s) => s.status === filterStatus)

  useSyncedRefresh(reload)
  useAddActionRedirect(openSheet)

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Subscription',
      description: 'Are you sure you want to delete this subscription?',
      onConfirm: async () => {
        await request.delete(`/api/subscriptions/${id}`)
        toast.success('Subscription deleted')
        await reload()
      },
    })
  }

  const activeSubs = allSubscriptions.filter((s) => s.status === 'active')
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    const amount = s.amount || 0
    if (s.frequency === 'weekly') return sum + amount * 4.33
    if (s.frequency === 'quarterly') return sum + amount / 3
    if (s.frequency === 'yearly') return sum + amount / 12
    return sum + amount
  }, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" subtitle="Track recurring subscriptions and billing">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>
            Add Subscription
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openSheet} label="Add subscription" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Active Subscriptions</p>
          <p className="text-2xl font-bold">{activeSubs.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Est. Monthly Cost</p>
          <p className="text-2xl font-bold">{formatCurrency(monthlyTotal)}</p>
        </div>
      </div>

      <FilterButtonGroup
        value={filterStatus}
        onValueChange={setFilterStatus}
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
      />

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No subscriptions yet"
            description="Add your first subscription to track recurring costs"
            actionLabel="Add Your First Subscription"
            onAction={openSheet}
          />
        ) : (
          subscriptions.map((sub) => (
            <Card key={sub._id} delay={0.1} hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{sub.name}</h3>
                    <Badge variant={STATUS_VARIANT[sub.status] || 'default'}>
                      {sub.status}
                    </Badge>
                  </div>
                </div>
                <RowActions>
                  <EditButton onClick={() => router.push(`/dashboard/subscriptions/${sub._id}`)} />
                  <DeleteButton onClick={() => handleDelete(sub._id)} />
                </RowActions>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(sub.amount)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      / {FREQUENCY_LABELS[sub.frequency]?.toLowerCase() || sub.frequency}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Frequency</p>
                  <p className="text-sm font-medium text-foreground">
                    {FREQUENCY_LABELS[sub.frequency] || sub.frequency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Next Billing</p>
                  <p className="text-sm font-medium text-foreground">
                    {sub.nextBillingDate
                      ? format(new Date(sub.nextBillingDate), 'MMM dd, yyyy')
                      : '—'}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <FormSheet open={open} onOpenChange={setOpen} title="Add Subscription">
        <SubscriptionForm
          variant="sheet"
          onSuccess={() => {
            closeSheet()
            reload()
          }}
          onCancel={closeSheet}
        />
      </FormSheet>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionsPageContent />
    </Suspense>
  )
}
