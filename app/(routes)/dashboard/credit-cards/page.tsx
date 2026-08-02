'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import {
  formatCurrency,
  formatDayMonth,
  getBillingCycleDates,
  nextDateForDayOfMonth,
} from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'

const CreditCardsPageContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      router.replace('/dashboard/credit-cards/new')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (user) fetchCards()
  }, [user])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const response = await request.get('/api/credit-cards')
      setCards(response.data)
    } catch {
      toast.error('Failed to load credit cards')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Credit Card',
      description: 'Are you sure you want to delete this credit card?',
      onConfirm: async () => {
        await request.delete(`/api/credit-cards/${id}`)
        toast.success('Credit card deleted')
        fetchCards()
      },
    })
  }

  const totalLimit = cards.reduce((sum, c) => sum + (c.creditLimit || 0), 0)
  const totalBalance = cards.reduce((sum, c) => sum + (c.currentBalance || 0), 0)
  const totalAvailable = totalLimit - totalBalance
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader title="Credit Cards" subtitle="Track limits, balances, and due dates">
        <div className="hidden md:block">
          <AddButton onClick={() => router.push('/dashboard/credit-cards/new')}>
            Add Card
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={() => router.push('/dashboard/credit-cards/new')} label="Add card" />

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
          <p className="text-white/70 text-xs mt-1">{utilization.toFixed(0)}% utilized</p>
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
            onAction={() => router.push('/dashboard/credit-cards/new')}
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
              <SwipeableRow
                key={card._id}
                onEdit={() => router.push(`/dashboard/credit-cards/${card._id}`)}
                onDelete={() => handleDelete(card._id)}
              >
                <Card delay={0.1} hover className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{card.cardName}</h3>
                        {card.lastFourDigits && (
                          <span className="text-sm text-muted-foreground">•••• {card.lastFourDigits}</span>
                        )}
                      </div>
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
                      {card.rewardsProgram && (
                        <p className="text-xs text-muted-foreground mt-1">{card.rewardsProgram}</p>
                      )}
                    </div>
                    <DesktopRowActions>
                      <EditButton onClick={() => router.push(`/dashboard/credit-cards/${card._id}`)} />
                      <DeleteButton onClick={() => handleDelete(card._id)} />
                    </DesktopRowActions>
                  </div>

                  <div className="mt-3 mb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{cardUtil.toFixed(0)}% used</span>
                      <span>{formatCurrency(available)} available</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          cardUtil > 80
                            ? 'bg-red-500'
                            : cardUtil > 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
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
                  {card.apr && (
                    <p className="text-xs text-muted-foreground mt-2">APR: {card.apr}%</p>
                  )}
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

export default function CreditCardsPage() {
  return (
    <Suspense fallback={null}>
      <CreditCardsPageContent />
    </Suspense>
  )
}
