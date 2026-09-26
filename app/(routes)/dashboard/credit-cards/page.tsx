'use client'
import React, { Suspense, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import {
  formatCurrency,
  formatDayMonth,
  getBillingCycleDates,
  nextDateForDayOfMonth,
} from '@/lib/utils/format'
import {
  DEFAULT_CARD_COLOR,
  formatCardNumber,
} from '@/lib/utils/creditCard'
import { getUtilizationBarClass } from '@/lib/utils/utilization'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect, useEditActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { Badge } from '@/components/ui/badge'
import { ToggleButtonGroup } from '@/components/ui/toggle-button'
import { CreditCardForm } from './_components/CreditCardForm'
import { DebitCardForm } from './_components/DebitCardForm'

type CardTab = 'credit' | 'debit'

function DebitCardsTab({
  userId,
  onAdd,
  onEdit,
  onDelete,
  cards,
  loading,
}: {
  userId?: string
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  cards: any[]
  loading: boolean
}) {
  const { accounts } = useBankAccounts(userId)
  const accountById = new Map(accounts.map((a) => [String(a._id), a]))
  // Cards whose account was deleted locally disappear until the next sync removes them.
  const visible = cards
    .map((card) => ({ card, account: accountById.get(String(card.accountId?._id ?? card.accountId)) }))
    .filter((row) => row.account)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No debit cards yet"
        description="Link a debit card to a bank account to keep its details, expiry and ATM limit handy"
        actionLabel="Add Debit Card"
        onAction={onAdd}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map(({ card, account }) => {
        const color = account?.color || DEFAULT_CARD_COLOR
        return (
          <article key={card._id} className="surface-card relative flex flex-col overflow-hidden">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
            <div className="flex items-start gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}1f`, color }}
                aria-hidden="true"
              >
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-foreground">
                  {card.cardName || `${card.network} Debit`}
                </h3>
                <p className="truncate text-xs text-muted-foreground">{account?.accountName}</p>
              </div>
              <RowActions>
                <EditButton onClick={() => onEdit(card._id)} />
                <DeleteButton onClick={() => onDelete(card._id)} />
              </RowActions>
            </div>
            <div className="flex items-end justify-between gap-3 px-4 pt-4 sm:px-5">
              <p className="font-mono text-lg tracking-widest text-foreground">
                •••• {card.lastFourDigits || '····'}
              </p>
              <Badge variant="muted">{card.network}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 px-4 py-4 text-sm sm:px-5">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Expiry</dt>
                <dd className="mt-0.5 font-mono">{card.expiry || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">ATM limit / day</dt>
                <dd className="mt-0.5 tabular-nums">
                  {card.atmLimit != null ? formatCurrency(card.atmLimit) : '—'}
                </dd>
              </div>
              {card.notes && (
                <div className="col-span-2 min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</dt>
                  <dd className="mt-0.5 line-clamp-2 text-muted-foreground">{card.notes}</dd>
                </div>
              )}
            </dl>
          </article>
        )
      })}
    </div>
  )
}

const CreditCardsPageContent = () => {
  const { user } = useAuth()
  const userId = user?.id
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab: CardTab = searchParams.get('tab') === 'debit' ? 'debit' : 'credit'
  const setTab = (next: string) =>
    router.replace(next === 'debit' ? `${pathname}?tab=debit` : pathname, { scroll: false })

  const { data: cards, loading, reload } = useLocalList('creditCards', userId)
  const { data: debitCards, loading: debitLoading, reload: reloadDebit } = useLocalList('debitCards', userId)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, entityId, openSheet, closeSheet } = useFormSheet()
  const debitSheet = useFormSheet()
  const openAdd = tab === 'debit' ? debitSheet.openSheet : openSheet

  const reloadAll = useCallback(async () => {
    await Promise.all([reload(), reloadDebit()])
  }, [reload, reloadDebit])

  useSyncedRefresh(reloadAll)
  useAddActionRedirect(openAdd)
  useEditActionRedirect(openSheet)

  const handleDeleteDebit = (id: string) => {
    confirmDelete({
      title: 'Delete Debit Card',
      description: 'Are you sure you want to delete this debit card? The linked bank account is not affected.',
      onConfirm: async () => {
        await request.delete(`/api/debit-cards/${id}`)
        toast.success('Debit card deleted')
        await reloadDebit()
      },
    })
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Credit Card',
      description: 'Are you sure you want to delete this credit card?',
      onConfirm: async () => {
        await request.delete(`/api/credit-cards/${id}`)
        toast.success('Credit card deleted')
        await reload()
      },
    })
  }

  const totalLimit = cards.reduce((sum, c) => sum + (c.creditLimit || 0), 0)
  const totalBalance = cards.reduce((sum, c) => sum + (c.currentBalance || 0), 0)
  const totalAvailable = totalLimit - totalBalance

  return (
    <div className="space-y-6">
      <PageHeader title="Cards" subtitle="Credit and debit cards in one place">
        <div className="hidden md:block">
          <AddButton onClick={openAdd}>
            {tab === 'debit' ? 'Add Debit Card' : 'Add Credit Card'}
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openAdd} label={tab === 'debit' ? 'Add debit card' : 'Add credit card'} />

      <ToggleButtonGroup
        value={tab}
        onValueChange={setTab}
        options={[
          { value: 'credit', label: `Credit${cards.length ? ` · ${cards.length}` : ''}` },
          { value: 'debit', label: `Debit${debitCards.length ? ` · ${debitCards.length}` : ''}` },
        ]}
        className="sm:w-80"
        aria-label="Card type"
      />

      {tab === 'debit' ? (
        <DebitCardsTab
          userId={userId}
          cards={debitCards}
          loading={debitLoading}
          onAdd={() => debitSheet.openSheet()}
          onEdit={(id) => debitSheet.openSheet(id)}
          onDelete={handleDeleteDebit}
        />
      ) : (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Total Limit</p>
          <p className="text-2xl font-bold">{formatCurrency(totalLimit)}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Outstanding Balance</p>
          <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Available Credit</p>
          <p className="text-2xl font-bold">{formatCurrency(totalAvailable)}</p>
          <p className="text-white/70 text-xs mt-1">{formatCurrency(totalBalance)} utilized</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : cards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No credit cards yet"
            description="Add your cards to track limits, balances, and payment due dates"
            actionLabel="Add Your First Card"
            onAction={openSheet}
          />
        ) : (
          cards.map((card) => {
            const available = (card.creditLimit || 0) - (card.currentBalance || 0)
            const cardUtil =
              card.creditLimit > 0 ? ((card.currentBalance || 0) / card.creditLimit) * 100 : 0
            const today = new Date()
            const billing =
              card.statementDay && card.dueDay
                ? getBillingCycleDates(card.statementDay, card.dueDay, today)
                : null

            return (
                <Card key={card._id} delay={0.1} hover className="p-5">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${card.color || DEFAULT_CARD_COLOR}15`,
                        color: card.color || DEFAULT_CARD_COLOR,
                      }}
                    >
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{card.cardName}</h3>
                        {card.cardType && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {card.cardType}
                          </span>
                        )}
                      </div>
                      {(card.cardNumber || card.lastFourDigits) && (
                        <p className="text-sm text-muted-foreground font-mono tracking-wide">
                          {card.cardNumber
                            ? formatCardNumber(card.cardNumber)
                            : card.lastFourDigits}
                        </p>
                      )}
                      {card.issuer && (
                        <p className="text-sm text-muted-foreground">{card.issuer}</p>
                      )}
                      {(card.statementDay || card.dueDay) && (
                        <p className="text-sm text-muted-foreground">
                          {card.statementDay
                            ? `Statement: ${formatDayMonth(
                                billing
                                  ? billing.statement
                                  : nextDateForDayOfMonth(card.statementDay, today),
                              )}`
                            : ''}
                          {card.statementDay && card.dueDay ? ' · ' : ''}
                          {card.dueDay
                            ? `Due: ${formatDayMonth(
                                billing
                                  ? billing.due
                                  : nextDateForDayOfMonth(card.dueDay, today),
                              )}`
                            : ''}
                        </p>
                      )}
                      {card.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.notes}</p>
                      )}
                    </div>
                    <RowActions>
                      <EditButton onClick={() => openSheet(card._id)} />
                      <DeleteButton onClick={() => handleDelete(card._id)} />
                    </RowActions>
                  </div>

                  <div className="mt-3 mb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{formatCurrency(card.currentBalance || 0)} utilized</span>
                      <span>{formatCurrency(available)} available</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getUtilizationBarClass(cardUtil)}`}
                        style={{ width: `${Math.min(100, cardUtil)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Balance</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(card.currentBalance || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Limit</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(card.creditLimit)}
                      </p>
                    </div>
                  </div>
                </Card>
            )
          })
        )}
      </div>
      </>
      )}

      <FormSheet
        open={debitSheet.open}
        onOpenChange={debitSheet.setOpen}
        title={debitSheet.entityId ? 'Edit Debit Card' : 'Add Debit Card'}
      >
        <DebitCardForm
          key={debitSheet.entityId ?? 'new'}
          debitCardId={debitSheet.entityId}
          variant="sheet"
          onSuccess={() => {
            debitSheet.closeSheet()
            reloadDebit()
          }}
          onCancel={debitSheet.closeSheet}
        />
      </FormSheet>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title={entityId ? 'Edit Credit Card' : 'Add Credit Card'}
      >
        <CreditCardForm
          key={entityId ?? 'new'}
          creditCardId={entityId}
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

export default function CreditCardsPage() {
  return (
    <Suspense fallback={null}>
      <CreditCardsPageContent />
    </Suspense>
  )
}
