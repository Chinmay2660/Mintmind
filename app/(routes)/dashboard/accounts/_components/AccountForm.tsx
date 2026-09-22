'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { IconPicker } from '@/components/ui/icon-picker'
import { FormSubmitBar } from '@/components/ui/form-buttons'
import {
  FormField,
  FormLayout,
  FormSection,
  FormSkeleton,
} from '@/components/ui/form-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import { useBalanceAdjustmentPrompt } from './BalanceAdjustmentPrompt'
import type { EntityFormProps } from '@/lib/forms/types'

const defaultFormData = () => ({
  accountName: '',
  bankName: '',
  accountNumber: '',
  accountType: 'Savings',
  balance: 0,
  color: '#2563eb',
  icon: '🏦',
})

interface AccountFormProps extends EntityFormProps {
  accountId?: string
}

export function AccountForm({
  accountId,
  variant = 'page',
  onSuccess,
  onCancel,
}: AccountFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!accountId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)
  const [originalBalance, setOriginalBalance] = useState<number | null>(null)
  const { prompt: promptBalanceAdjustment, dialogs: balanceAdjustmentDialogs } =
    useBalanceAdjustmentPrompt()

  useEffect(() => {
    if (!accountId || !user) return
    setLoading(true)
    fetchEntityRecord('bankAccounts', accountId)
      .then((account) => {
        if (!account) throw new Error('Not found')
        setFormData({
          accountName: account.accountName,
          bankName: account.bankName,
          accountNumber: account.accountNumber || '',
          accountType: account.accountType,
          balance: account.balance,
          color: account.color,
          icon: account.icon,
        })
        setOriginalBalance(account.balance)
      })
      .catch(() => {
        toast.error('Failed to load account')
        router.push('/dashboard/accounts')
      })
      .finally(() => setLoading(false))
  }, [accountId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (accountId) {
        await request.put(`/api/bank-accounts/${accountId}`, formData)
        toast.success('Account updated successfully')
        const balanceChanged =
          originalBalance !== null && formData.balance !== originalBalance
        if (balanceChanged) {
          promptBalanceAdjustment(
            {
              previousBalance: originalBalance,
              newBalance: formData.balance,
              isCash: false,
              accountId,
              accountName: formData.accountName,
            },
            () => {
              if (onSuccess) onSuccess()
              else router.push('/dashboard/accounts')
            }
          )
          return
        }
      } else {
        await request.post('/api/bank-accounts', formData)
        toast.success('Account added successfully')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/accounts')
    } catch {
      toast.error('Failed to save account')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
  }

  return (
    <>
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection title="Account details">
        <FormField label="Account Name" required>
          <Input
            value={formData.accountName}
            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
            required
            placeholder="e.g., HDFC Savings"
          />
        </FormField>
        <FormField label="Bank Name" required>
          <Input
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            required
            placeholder="e.g., HDFC Bank"
          />
        </FormField>
        <FormField label="Account Number (Optional)">
          <Input
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            placeholder="Account number"
          />
        </FormField>
        <FormField label="Account Type" span="compact">
          <select
            value={formData.accountType}
            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
            className="form-select"
          >
            <option value="Savings">Savings</option>
            <option value="Current">Current</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Other">Other</option>
          </select>
        </FormField>
        <FormField label={accountId ? 'Balance' : 'Initial Balance'} span="compact" required>
          <Input
            type="number"
            value={formData.balance || ''}
            onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            required
            step="0.01"
          />
        </FormField>
      </FormSection>
      <FormSection title="Appearance">
        <FormField label="Icon" span="icon">
          <IconPicker
            value={formData.icon}
            onChange={(icon) => setFormData({ ...formData, icon })}
          />
        </FormField>
        <FormField label="Color" span="color">
          <Input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-10 w-full cursor-pointer p-1"
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={accountId ? 'Update Account' : 'Add Account'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
    {balanceAdjustmentDialogs}
  </>
  )
}
