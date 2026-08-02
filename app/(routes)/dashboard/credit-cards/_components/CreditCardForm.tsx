'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { useAuth } from '@/lib/hooks/useAuth'

const defaultFormData = () => ({
  cardName: '',
  issuer: '',
  lastFourDigits: '',
  creditLimit: '',
  utilization: '',
  statementDay: '',
  dueDay: '',
  apr: '',
  rewardsProgram: '',
  notes: '',
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
    request
      .get(`/api/credit-cards/${creditCardId}`)
      .then((res) => {
        const card = res.data
        setFormData({
          cardName: card.cardName,
          issuer: card.issuer || '',
          lastFourDigits: card.lastFourDigits || '',
          creditLimit: card.creditLimit != null ? String(card.creditLimit) : '',
          utilization:
            card.creditLimit > 0 && card.currentBalance != null
              ? String((card.currentBalance / card.creditLimit) * 100)
              : '',
          statementDay: card.statementDay || '',
          dueDay: card.dueDay || '',
          apr: card.apr || '',
          rewardsProgram: card.rewardsProgram || '',
          notes: card.notes || '',
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
      const utilization = parseFloat(formData.utilization) || 0
      const payload = {
        cardName: formData.cardName,
        issuer: formData.issuer,
        lastFourDigits: formData.lastFourDigits,
        creditLimit,
        currentBalance: creditLimit * (utilization / 100),
        rewardsProgram: formData.rewardsProgram,
        notes: formData.notes,
        statementDay: formData.statementDay ? parseInt(formData.statementDay) : null,
        dueDay: formData.dueDay ? parseInt(formData.dueDay) : null,
        apr: formData.apr ? parseFloat(formData.apr) : null,
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
        <label className="text-sm font-medium mb-1 block">Last 4 Digits (Optional)</label>
        <Input
          value={formData.lastFourDigits}
          onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value.slice(0, 4) })}
          placeholder="1234"
          maxLength={4}
          className="h-12"
        />
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
        <label className="text-sm font-medium mb-1 block">Utilization %</label>
        <Input
          type="number"
          value={formData.utilization}
          onChange={(e) => setFormData({ ...formData, utilization: e.target.value })}
          placeholder="0"
          step="0.01"
          min="0"
          max="100"
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
        <label className="text-sm font-medium mb-1 block">APR % (Optional)</label>
        <Input
          type="number"
          value={formData.apr}
          onChange={(e) => setFormData({ ...formData, apr: e.target.value })}
          step="0.01"
          placeholder="Annual percentage rate"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Rewards Program (Optional)</label>
        <Input
          value={formData.rewardsProgram}
          onChange={(e) => setFormData({ ...formData, rewardsProgram: e.target.value })}
          placeholder="e.g., SmartBuy, Reward Points"
          className="h-12"
        />
      </div>
      <p className="form-field-full text-sm text-muted-foreground">
        A Credit Card account is created automatically in Accounts for payments.
      </p>
      <div className="form-field-full">
        <label className="text-sm font-medium mb-1 block">Notes (Optional)</label>
        <Input
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes"
          className="h-12"
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
