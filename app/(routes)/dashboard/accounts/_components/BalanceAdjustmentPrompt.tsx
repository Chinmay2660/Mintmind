'use client'

import { useState, useCallback, useRef } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { TransactionForm } from '@/app/(routes)/dashboard/transactions/_components/TransactionForm'
import { formatCurrency } from '@/lib/utils/format'

export interface BalanceAdjustmentRequest {
  previousBalance: number
  newBalance: number
  isCash: boolean
  accountId?: string
  accountName?: string
}

export function useBalanceAdjustmentPrompt() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [request, setRequest] = useState<BalanceAdjustmentRequest | null>(null)
  const onCompleteRef = useRef<(() => void) | null>(null)

  const prompt = useCallback((req: BalanceAdjustmentRequest, complete?: () => void) => {
    const delta = req.newBalance - req.previousBalance
    if (Math.abs(delta) < 0.01) {
      complete?.()
      return
    }
    setRequest(req)
    onCompleteRef.current = complete ?? null
    setConfirmOpen(true)
  }, [])

  const finish = useCallback(() => {
    setConfirmOpen(false)
    setFormOpen(false)
    setRequest(null)
    onCompleteRef.current?.()
    onCompleteRef.current = null
  }, [])

  const handleSkip = () => finish()

  const handleConfirm = () => {
    setConfirmOpen(false)
    setFormOpen(true)
  }

  const delta = request ? request.newBalance - request.previousBalance : 0
  const accountLabel = request?.isCash ? 'Cash' : (request?.accountName ?? 'Account')

  const dialogs = (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) handleSkip()
        }}
        title="Record transaction?"
        description={`Your ${accountLabel} balance changed by ${formatCurrency(Math.abs(delta))}. Would you like to record this as a transaction?`}
        confirmLabel="Record Transaction"
        cancelLabel="Skip"
        onConfirm={handleConfirm}
        onCancel={handleSkip}
      />
      {request && (
        <FormSheet
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) handleSkip()
          }}
          title="Record Balance Change"
        >
          <TransactionForm
            defaultValues={{
              type: delta > 0 ? 'income' : 'expense',
              amount: Math.abs(delta),
              isCash: request.isCash,
              accountId: request.accountId ?? '',
              description: 'Balance adjustment',
            }}
            skipBalanceUpdate
            lockType
            lockPaymentMethod
            onSuccess={finish}
          />
        </FormSheet>
      )}
    </>
  )

  return { prompt, dialogs }
}
