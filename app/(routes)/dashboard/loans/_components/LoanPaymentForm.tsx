'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { FormSubmitBar } from '@/components/ui/form-buttons'
import { FormField, FormLayout, FormSection } from '@/components/ui/form-layout'
import { ToggleButtonGroup } from '@/components/ui/toggle-button'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { useAuth } from '@/lib/hooks/useAuth'
import { splitLoanPayment } from '@/lib/utils/loans'
import { formatCurrency } from '@/lib/utils/format'
import type { EntityFormProps } from '@/lib/forms/types'

interface LoanPaymentFormProps extends EntityFormProps {
  loanId: string
  outstanding: number
  interestRate: number
  actualEmi?: number
  currentEmi?: number
  defaultAmount?: number
  defaultPaymentType?: 'emi' | 'advance' | 'prepayment' | 'partial'
  onSuccess?: () => void
}

export function LoanPaymentForm({
  loanId,
  outstanding,
  interestRate,
  actualEmi = 0,
  currentEmi = 0,
  defaultAmount = 0,
  defaultPaymentType = 'emi',
  variant = 'sheet',
  onSuccess,
  onCancel,
}: LoanPaymentFormProps) {
  const { user } = useAuth()
  const { accounts } = useBankAccounts(user?.id)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    amount: defaultAmount,
    date: new Date().toISOString().split('T')[0],
    paymentType: defaultPaymentType,
    isCash: false,
    accountId: '',
    notes: '',
  })

  const split = useMemo(
    () =>
      formData.amount > 0
        ? splitLoanPayment(
            outstanding,
            interestRate,
            formData.amount,
            formData.paymentType,
            actualEmi
          )
        : null,
    [outstanding, interestRate, formData.amount, formData.paymentType, actualEmi]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    setSaving(true)
    try {
      await request.post('/api/loan-payments', {
        loanId,
        ...formData,
        accountId: formData.isCash ? null : formData.accountId || null,
      })
      toast.success(
        formData.paymentType === 'prepayment' ? 'Prepayment recorded' : 'Payment recorded'
      )
      onSuccess?.()
    } catch {
      toast.error('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const isPrepayment = ['prepayment', 'advance'].includes(formData.paymentType)

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection
        title={isPrepayment ? 'Prepayment' : 'Payment'}
        description={
          isPrepayment
            ? 'Lump-sum payment — 100% goes to principal reduction.'
            : 'Interest is paid first; the rest reduces outstanding principal.'
        }
      >
        <FormField label="Payment type">
          <select
            value={formData.paymentType}
            onChange={(e) => {
              const paymentType = e.target.value as typeof formData.paymentType
              const amount =
                paymentType === 'emi'
                  ? currentEmi || actualEmi || defaultAmount
                  : formData.amount
              setFormData({ ...formData, paymentType, amount })
            }}
            className="form-select"
          >
            <option value="emi">Monthly EMI</option>
            <option value="prepayment">Prepayment</option>
            <option value="advance">Advance payment</option>
            <option value="partial">Partial payment</option>
          </select>
        </FormField>
        <FormField label="Amount" required>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            required
          />
          {formData.paymentType === 'emi' && currentEmi > 0 && (
            <button
              type="button"
              onClick={() => setFormData({ ...formData, amount: currentEmi })}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Use current EMI ({formatCurrency(currentEmi)})
            </button>
          )}
        </FormField>
        {split && (
          <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
            <p className="font-medium text-foreground">Breakdown</p>
            <p className="text-muted-foreground">
              Interest: <span className="text-foreground">{formatCurrency(split.interestPaid)}</span>
              {' · '}
              Principal: <span className="text-foreground">{formatCurrency(split.principalPaid)}</span>
            </p>
            {!isPrepayment && split.extraPrincipal > 0 && (
              <p className="text-success">
                Extra principal (above contractual EMI): {formatCurrency(split.extraPrincipal)}
              </p>
            )}
            {isPrepayment && (
              <p className="text-success">Full amount reduces outstanding principal</p>
            )}
          </div>
        )}
        <FormField label="Date" required>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Paid via">
          <ToggleButtonGroup
            value={formData.isCash ? 'cash' : 'account'}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                isCash: value === 'cash',
                accountId: value === 'cash' ? '' : formData.accountId,
              })
            }
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'account', label: 'Bank' },
            ]}
          />
        </FormField>
        {!formData.isCash && (
          <FormField label="Account">
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="form-select"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.icon} {acc.accountName}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label="Notes" span="full">
          <Input
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional"
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={isPrepayment ? 'Record prepayment' : 'Record payment'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
