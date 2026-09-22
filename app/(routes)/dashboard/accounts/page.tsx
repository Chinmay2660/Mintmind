'use client'
import React, { Suspense, useCallback, useState } from 'react'
import { Wallet, Banknote, Edit } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeader } from '@/components/ui/section-header'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { FormField, FormLayout, FormSection } from '@/components/ui/form-layout'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { ListItemSkeleton } from '@/components/ui/loading-skeleton'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { useLocalSingleton } from '@/lib/hooks/useLocalData'
import { useAddActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { useBalanceAdjustmentPrompt } from './_components/BalanceAdjustmentPrompt'
import { AccountForm } from './_components/AccountForm'
import { cn } from '@/lib/utils'

function StatTile({
  label,
  value,
  icon: Icon,
  loading,
  action,
  className,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  loading?: boolean
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('surface-card flex items-center gap-3 p-4', className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mm-stat-label">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{loading ? '—' : value}</p>
      </div>
      {action}
    </div>
  )
}

const AccountsPageContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const { accounts, loading: accountsLoading, refetch: reloadAccounts } = useBankAccounts(userId)
  const { data: cash, loading: cashLoading, reload: reloadCash } = useLocalSingleton(
    'cash',
    'cash',
    userId
  )
  const loading = accountsLoading || cashLoading
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false)
  const [cashAmount, setCashAmount] = useState(0)
  const { open, setOpen, openSheet, closeSheet } = useFormSheet()
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { prompt: promptBalanceAdjustment, dialogs: balanceAdjustmentDialogs } =
    useBalanceAdjustmentPrompt()
  const { fmt } = usePrivacyAmount()

  useAddActionRedirect(openSheet)

  const reload = useCallback(async () => {
    await Promise.all([reloadAccounts(), reloadCash()])
  }, [reloadAccounts, reloadCash])

  useSyncedRefresh(reload)

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Account',
      description: 'Are you sure you want to delete this account?',
      onConfirm: async () => {
        await request.delete(`/api/bank-accounts/${id}`)
        toast.success('Account deleted successfully')
        await reload()
      },
    })
  }

  const handleCashUpdate = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const previousBalance = cash?.amount || 0
    try {
      await request.put('/api/cash', { amount: cashAmount })
      toast.success('Cash updated successfully')
      setIsCashDialogOpen(false)
      await reload()
      promptBalanceAdjustment({
        previousBalance,
        newBalance: cashAmount,
        isCash: true,
      })
    } catch (error) {
      toast.error('Failed to update cash')
    }
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) + (cash?.amount || 0)

  const cashForm = (
    <FormLayout variant="sheet" onSubmit={handleCashUpdate}>
      <FormSection>
        <FormField label="Amount" span="compact">
          <Input
            type="number"
            value={cashAmount || ''}
            onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
            placeholder="0"
            step="0.01"
          />
        </FormField>
      </FormSection>
      <FormButtonGroup
        submitLabel="Update"
        onCancel={() => setIsCashDialogOpen(false)}
      />
    </FormLayout>
  )

  return (
    <>
      <PageHeader title="Accounts" subtitle="Bank accounts & cash">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>Add Account</AddButton>
        </div>
      </PageHeader>

      <FormSheet open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen} title="Update Cash" size="md">
        {cashForm}
      </FormSheet>

      <FormSheet open={open} onOpenChange={setOpen} title="Add Account">
        <AccountForm
          variant="sheet"
          onSuccess={() => {
            closeSheet()
            reload()
          }}
          onCancel={closeSheet}
        />
      </FormSheet>

      <FAB onClick={openSheet} label="Add account" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile
          label="Total balance"
          value={fmt(totalBalance)}
          icon={Wallet}
          loading={loading}
        />
        <StatTile
          label="Cash"
          value={fmt(cash?.amount || 0)}
          icon={Banknote}
          loading={loading}
          action={
            !loading ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg"
                onClick={() => {
                  setCashAmount(cash?.amount || 0)
                  setIsCashDialogOpen(true)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            ) : undefined
          }
        />
      </div>

      <section>
        <SectionHeader
          title="Bank accounts"
          subtitle={loading ? undefined : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
        />

        {loading ? (
          <ListItemSkeleton count={3} />
        ) : accounts.length === 0 ? (
          <div className="surface-card py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No accounts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add your first account to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <div key={account._id} className="surface-card p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: `${account.color}15`, color: account.color }}
                  >
                    {account.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">{account.accountName}</h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {account.bankName} · {account.accountType}
                    </p>
                    {account.accountNumber && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {account.accountNumber}
                      </p>
                    )}
                  </div>
                  <RowActions>
                    <EditButton onClick={() => router.push(`/dashboard/accounts/${account._id}`)} />
                    <DeleteButton onClick={() => handleDelete(account._id)} />
                  </RowActions>
                </div>
                <p className="mt-3 text-lg font-semibold tabular-nums">
                  {fmt(account.balance)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog {...confirmDialogProps} />
      {balanceAdjustmentDialogs}
    </>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsPageContent />
    </Suspense>
  )
}
