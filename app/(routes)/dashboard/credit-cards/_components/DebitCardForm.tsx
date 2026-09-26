'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { FormSubmitBar } from '@/components/ui/form-buttons'
import { FormField, FormLayout, FormSection, FormSkeleton } from '@/components/ui/form-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

const NETWORKS = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Other']

const defaultFormData = () => ({
  accountId: '',
  cardName: '',
  network: 'RuPay',
  lastFourDigits: '',
  expiry: '',
  atmLimit: '',
  notes: '',
})

/** Formats typed digits as MM/YY. */
const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

interface DebitCardFormProps extends EntityFormProps {
  debitCardId?: string
}

export function DebitCardForm({ debitCardId, variant = 'page', onSuccess, onCancel }: DebitCardFormProps) {
  const { user } = useAuth()
  const { accounts, loading: accountsLoading } = useBankAccounts(user?.id)
  const bankAccounts = accounts.filter((a) => a.accountType !== 'Credit Card')
  const [loading, setLoading] = useState(!!debitCardId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  const set = (patch: Partial<ReturnType<typeof defaultFormData>>) =>
    setFormData((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    if (!debitCardId || !user) return
    setLoading(true)
    fetchEntityRecord('debitCards', debitCardId)
      .then((card) => {
        if (!card) throw new Error('Not found')
        setFormData({
          accountId: String(card.accountId?._id ?? card.accountId ?? ''),
          cardName: card.cardName || '',
          network: card.network || 'Other',
          lastFourDigits: card.lastFourDigits || '',
          expiry: card.expiry || '',
          atmLimit: card.atmLimit != null ? String(card.atmLimit) : '',
          notes: card.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load debit card')
        onCancel?.()
      })
      .finally(() => setLoading(false))
  }, [debitCardId, user, onCancel])

  useEffect(() => {
    if (!debitCardId && !formData.accountId && bankAccounts.length === 1) {
      set({ accountId: String(bankAccounts[0]._id) })
    }
  }, [debitCardId, formData.accountId, bankAccounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...formData, atmLimit: formData.atmLimit === '' ? null : Number(formData.atmLimit) }
    try {
      if (debitCardId) {
        await request.put(`/api/debit-cards/${debitCardId}`, payload)
        toast.success('Debit card updated')
      } else {
        await request.post('/api/debit-cards', payload)
        toast.success('Debit card added')
      }
      onSuccess?.()
    } catch {
      toast.error('Failed to save debit card')
    } finally {
      setSaving(false)
    }
  }

  if (loading || accountsLoading) return <FormSkeleton variant={variant} />

  if (bankAccounts.length === 0) {
    return (
      <div className="space-y-2 py-6 text-center">
        <p className="font-medium">Add a bank account first</p>
        <p className="text-sm text-muted-foreground">
          A debit card spends from a bank account, so it needs one to link to.
        </p>
        <Link href="/dashboard/accounts?action=add" className="text-sm font-medium text-primary hover:underline">
          Add bank account
        </Link>
      </div>
    )
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection title="Card details">
        <FormField label="Linked bank account" required span="full" hint="Payments with this card come out of this account.">
          <select
            value={formData.accountId}
            onChange={(e) => set({ accountId: e.target.value })}
            className="form-select"
            required
          >
            <option value="">Select account</option>
            {bankAccounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.icon} {acc.accountName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Network">
          <select value={formData.network} onChange={(e) => set({ network: e.target.value })} className="form-select">
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Card name" hint="Optional, e.g. Millennia">
          <Input
            value={formData.cardName}
            onChange={(e) => set({ cardName: e.target.value })}
            placeholder="Card variant"
          />
        </FormField>
        <FormField label="Last 4 digits" hint="Never enter the full card number or CVV">
          <Input
            value={formData.lastFourDigits}
            onChange={(e) => set({ lastFourDigits: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="1234"
            inputMode="numeric"
            pattern="\d{4}"
            title="Exactly 4 digits"
            autoComplete="off"
          />
        </FormField>
        <FormField label="Expiry">
          <Input
            value={formData.expiry}
            onChange={(e) => set({ expiry: formatExpiry(e.target.value) })}
            placeholder="MM/YY"
            inputMode="numeric"
            pattern="(0[1-9]|1[0-2])/\d{2}"
            title="MM/YY"
            autoComplete="off"
          />
        </FormField>
        <FormField label="Daily ATM limit">
          <Input
            type="number"
            inputMode="numeric"
            value={formData.atmLimit}
            onChange={(e) => set({ atmLimit: e.target.value })}
            placeholder="e.g., 25000"
            min="0"
          />
        </FormField>
        <FormField label="Notes">
          <Input
            value={formData.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Benefits, lounge access…"
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={debitCardId ? 'Update Card' : 'Add Card'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
