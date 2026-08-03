'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { useAuth } from '@/lib/hooks/useAuth'
import { getLocal } from '@/lib/offline/repository'
import { cn } from '@/lib/utils'
import {
  DEFAULT_CARD_COLOR,
  detectCardType,
  formatCardNumber,
  getLastFourDigits,
  stripCardDigits,
  type CardType,
} from '@/lib/utils/creditCard'

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

interface CreditCardFormProps {
  creditCardId?: string
}

export function CreditCardForm({ creditCardId }: CreditCardFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!creditCardId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!creditCardId || !user) return
    setLoading(true)
    getLocal('creditCards', creditCardId)
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
      router.push('/dashboard/credit-cards')
    } catch {
      toast.error('Failed to save credit card')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="w-full animate-pulse h-64 rounded-xl bg-muted/40" />
  }

  return (
    <form onSubmit={handleSubmit} className="form-panel">
      <div>
        <label className="text-sm font-medium mb-1 block">Card Name</label>
        <Input
          value={formData.cardName}
          onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
          required
          placeholder="e.g., HDFC Regalia, SBI SimplyCLICK"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Issuer / Bank (Optional)</label>
        <Input
          value={formData.issuer}
          onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
          placeholder="e.g., HDFC Bank"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Card Number (Optional)</label>
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
            className="h-12 pr-28"
          />
          {formData.cardType && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              {formData.cardType}
            </span>
          )}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Credit Limit</label>
        <Input
          type="number"
          value={formData.creditLimit}
          onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
          placeholder="0"
          required
          step="0.01"
          min="0"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Utilized Limit</label>
        <Input
          type="number"
          value={formData.utilizedLimit}
          onChange={(e) => setFormData({ ...formData, utilizedLimit: e.target.value })}
          placeholder="0"
          step="0.01"
          min="0"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Statement Day (1–31)</label>
        <Input
          type="number"
          value={formData.statementDay}
          onChange={(e) => setFormData({ ...formData, statementDay: e.target.value })}
          min="1"
          max="31"
          placeholder="Day of month"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Payment Due Day (1–31)</label>
        <Input
          type="number"
          value={formData.dueDay}
          onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
          min="1"
          max="31"
          placeholder="Day of month"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Color</label>
        <Input
          type="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="h-12 w-full"
        />
      </div>
      <p className="form-field-full text-sm text-muted-foreground">
        A Credit Card account is created automatically in Accounts for payments.
      </p>
      <div className="form-field-full">
        <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Rewards, benefits, reminders, or other card details..."
          rows={4}
          className={cn(
            'flex min-h-[6rem] w-full rounded-xl border surface-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y'
          )}
        />
      </div>
      <div className="form-field-full">
        <SubmitButton isLoading={saving} className="w-full sm:w-auto min-w-[10rem] h-12">
          {creditCardId ? 'Update Card' : 'Add Card'}
        </SubmitButton>
      </div>
    </form>
  )
}
