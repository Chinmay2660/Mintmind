'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { FormSubmitBar } from '@/components/ui/form-buttons'
import {
  FormField,
  FormLayout,
  FormSection,
  FormSkeleton,
} from '@/components/ui/form-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import { cn } from '@/lib/utils'
import {
  DEFAULT_CARD_COLOR,
  detectCardType,
  formatCardNumber,
  getLastFourDigits,
  stripCardDigits,
  type CardType,
} from '@/lib/utils/creditCard'
import type { EntityFormProps } from '@/lib/forms/types'

const defaultFormData = () => ({
  cardName: '',
  issuer: '',
  cardNumber: '',
  cardType: '' as CardType | '',
  creditLimit: '',
  utilizedLimit: '',
  statementDay: '',
  dueDay: '',
  notes: '',
  color: DEFAULT_CARD_COLOR,
})

interface CreditCardFormProps extends EntityFormProps {
  creditCardId?: string
}

export function CreditCardForm({
  creditCardId,
  variant = 'page',
  onSuccess,
  onCancel,
}: CreditCardFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!creditCardId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!creditCardId || !user) return
    setLoading(true)
    fetchEntityRecord('creditCards', creditCardId)
      .then((card) => {
        if (!card) throw new Error('Not found')
        setFormData({
          cardName: card.cardName,
          issuer: card.issuer || '',
          cardNumber: card.cardNumber || '',
          cardType: card.cardType || '',
          creditLimit: card.creditLimit != null ? String(card.creditLimit) : '',
          utilizedLimit: card.currentBalance != null ? String(card.currentBalance) : '',
          statementDay: card.statementDay || '',
          dueDay: card.dueDay || '',
          notes: card.notes || '',
          color: card.color || DEFAULT_CARD_COLOR,
        })
      })
      .catch(() => {
        toast.error('Failed to load credit card')
        router.push('/dashboard/credit-cards')
      })
      .finally(() => setLoading(false))
  }, [creditCardId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const creditLimit = parseFloat(formData.creditLimit) || 0
      const cardDigits = stripCardDigits(formData.cardNumber)
      const cardType = cardDigits ? detectCardType(cardDigits) : null
      const payload = {
        cardName: formData.cardName,
        issuer: formData.issuer,
        cardNumber: cardDigits || null,
        cardType: cardType || null,
        lastFourDigits: cardDigits ? getLastFourDigits(cardDigits) : null,
        creditLimit,
        currentBalance: parseFloat(formData.utilizedLimit) || 0,
        notes: formData.notes,
        statementDay: formData.statementDay ? parseInt(formData.statementDay) : null,
        dueDay: formData.dueDay ? parseInt(formData.dueDay) : null,
        color: formData.color,
      }
      if (creditCardId) {
        await request.put(`/api/credit-cards/${creditCardId}`, payload)
        toast.success('Credit card updated')
      } else {
        await request.post('/api/credit-cards', payload)
        toast.success('Credit card added')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/credit-cards')
    } catch {
      toast.error('Failed to save credit card')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton variant={variant} />
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection title="Card details">
        <FormField label="Card Name" required>
          <Input
            value={formData.cardName}
            onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
            required
            placeholder="e.g., HDFC Regalia, SBI SimplyCLICK"
          />
        </FormField>
        <FormField label="Issuer / Bank (Optional)">
          <Input
            value={formData.issuer}
            onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
            placeholder="e.g., HDFC Bank"
          />
        </FormField>
        <FormField label="Card Number (Optional)" span="full">
          <div className="relative">
            <Input
              value={formatCardNumber(formData.cardNumber)}
              onChange={(e) => {
                const digits = stripCardDigits(e.target.value).slice(0, 19)
                setFormData({
                  ...formData,
                  cardNumber: digits,
                  cardType: detectCardType(digits) || '',
                })
              }}
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
              autoComplete="cc-number"
            />
            {formData.cardType && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                {formData.cardType}
              </span>
            )}
          </div>
        </FormField>
        <FormField label="Credit Limit" required>
          <Input
            type="number"
            value={formData.creditLimit}
            onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
            placeholder="0"
            required
            step="0.01"
            min="0"
          />
        </FormField>
        <FormField label="Utilized Limit">
          <Input
            type="number"
            value={formData.utilizedLimit}
            onChange={(e) => setFormData({ ...formData, utilizedLimit: e.target.value })}
            placeholder="0"
            step="0.01"
            min="0"
          />
        </FormField>
        <FormField label="Statement Day (1–31)">
          <Input
            type="number"
            value={formData.statementDay}
            onChange={(e) => setFormData({ ...formData, statementDay: e.target.value })}
            min="1"
            max="31"
            placeholder="Day of month"
          />
        </FormField>
        <FormField label="Payment Due Day (1–31)">
          <Input
            type="number"
            value={formData.dueDay}
            onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
            min="1"
            max="31"
            placeholder="Day of month"
          />
        </FormField>
      </FormSection>
      <FormSection title="Appearance">
        <FormField label="Color" span="color">
          <Input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-10 w-full cursor-pointer p-1"
          />
        </FormField>
        <FormField
          label="Description (Optional)"
          span="full"
          hint="A Credit Card account is created automatically in Accounts for payments."
        >
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Rewards, benefits, reminders, or other card details..."
            rows={4}
            className={cn(
              'flex min-h-[6rem] w-full rounded-xl border surface-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y'
            )}
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={creditCardId ? 'Update Card' : 'Add Card'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
