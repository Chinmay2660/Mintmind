'use client'
import React, { Suspense, useCallback, useState } from 'react'
import { Wallet, Banknote, Edit, User, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
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
import { useAddActionRedirect, useEditActionRedirect } from '@/lib/hooks/useAddActionRedirect'
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

type Account = ReturnType<typeof useBankAccounts>['accounts'][number]

const maskAccountNumber = (value: string) => `•••• ${value.replace(/\s/g, '').slice(-4)}`

const DEFAULT_ACCOUNT_COLOR = '#2563eb'
const ON_LIGHT_TEXT = '#0f172a'
const ON_DARK_TEXT = '#ffffff'

/** WCAG relative luminance; light backgrounds get dark text. */
function isLightColor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return false
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4
}

function AccountDetail({
  label,
  value,
  mono,
  className,
}: {
  label: string
  value?: string
  mono?: boolean
  className?: string
}) {
  if (!value) return null
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] uppercase tracking-wide opacity-70">{label}</dt>
      <dd className={cn('mt-0.5 truncate text-sm font-medium', mono && 'font-mono')} title={value}>
        {value}
      </dd>
    </div>
  )
}

function AccountCard({
  account,
  balance,
  privacyMode,
  onEdit,
  onDelete,
}: {
  account: Account
  balance: string
  privacyMode: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const isJoint = account.ownershipType === 'Joint'
  const title = `${account.bankName} - ${account.accountType || 'Savings'}`
  const OwnerIcon = isJoint ? Users : User
  const hasDetails = Boolean(
    account.accountNumber || account.ifscCode || account.nomineeName || (isJoint && account.jointHolders)
  )

  const color = account.color || DEFAULT_ACCOUNT_COLOR
  const light = isLightColor(color)
  const onCardAction = 'text-inherit opacity-80 hover:bg-black/10 hover:opacity-100'

  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5"
      style={{
        backgroundColor: color,
        backgroundImage: 'linear-gradient(135deg, rgb(255 255 255 / 0.16), rgb(0 0 0 / 0.24))',
        color: light ? ON_LIGHT_TEXT : ON_DARK_TEXT,
      }}
    >
      <div className="flex items-start gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl"
          aria-hidden="true"
        >
          🏦
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold" title={title}>
            {title}
          </h3>
          {account.branch && (
            <p className="truncate text-xs opacity-75">{account.branch}</p>
          )}
        </div>
        <RowActions>
          <EditButton onClick={onEdit} className={onCardAction} />
          <DeleteButton onClick={onDelete} className={onCardAction} />
        </RowActions>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide opacity-70">Balance</p>
          <p className="mt-0.5 truncate text-2xl font-semibold tabular-nums">{balance}</p>
        </div>
        <Badge className="border-transparent bg-black/15 text-inherit">
          <OwnerIcon className="h-3 w-3" aria-hidden="true" />
          {isJoint ? 'Joint' : 'Individual'}
        </Badge>
      </div>

      {hasDetails ? (
        <dl
          className={cn(
            'mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t px-4 py-4 sm:px-5',
            light ? 'border-black/10' : 'border-white/15'
          )}
        >
          <AccountDetail
            label="Account no."
            value={
              account.accountNumber && privacyMode
                ? maskAccountNumber(account.accountNumber)
                : account.accountNumber
            }
            mono
          />
          <AccountDetail label="IFSC" value={account.ifscCode} mono />
          {isJoint && (
            <AccountDetail
              label={account.operationMode ? `Joint · ${account.operationMode}` : 'Joint holders'}
              value={account.jointHolders}
              className="col-span-2"
            />
          )}
          <AccountDetail label="Nominee" value={account.nomineeName} className="col-span-2" />
        </dl>
      ) : (
        <div className="pb-4 sm:pb-5" />
      )}
    </article>
  )
}

const AccountsPageContent = () => {
  const { user } = useAuth()
  const userId = user?.id
  const { accounts: allAccounts, loading: accountsLoading, refetch: reloadAccounts } = useBankAccounts(userId)
  // Credit-card accounts are mirrors owned by the Credit Cards page.
  const accounts = allAccounts.filter((a) => a.accountType !== 'Credit Card')
  const { data: cash, loading: cashLoading, reload: reloadCash } = useLocalSingleton(
    'cash',
    'cash',
    userId
  )
  const loading = accountsLoading || cashLoading
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false)
  const [cashAmount, setCashAmount] = useState(0)
  const { open, setOpen, entityId, openSheet, closeSheet } = useFormSheet()
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { prompt: promptBalanceAdjustment, dialogs: balanceAdjustmentDialogs } =
    useBalanceAdjustmentPrompt()
  const { fmt, privacyMode } = usePrivacyAmount()

  useAddActionRedirect(openSheet)
  useEditActionRedirect(openSheet)

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

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title={entityId ? 'Edit Account' : 'Add Account'}
      >
        <AccountForm
          key={entityId ?? 'new'}
          accountId={entityId}
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
              <AccountCard
                key={account._id}
                account={account}
                balance={fmt(account.balance)}
                privacyMode={privacyMode}
                onEdit={() => openSheet(account._id)}
                onDelete={() => handleDelete(account._id)}
              />
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
