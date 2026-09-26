'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { ToggleButtonGroup } from '@/components/ui/toggle-button'
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

const ACCOUNT_TYPES = ['Savings', 'Salary', 'Current', 'Other']
const OPERATION_MODES = ['Either or Survivor', 'Former or Survivor', 'Jointly']

const defaultFormData = () => ({
  accountName: '',
  bankName: '',
  accountNumber: '',
  accountType: 'Savings',
  ownershipType: 'Individual',
  jointHolders: '',
  operationMode: OPERATION_MODES[0],
  ifscCode: '',
  branch: '',
  nomineeName: '',
  balance: '',
  color: '#2563eb',
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

  const set = (patch: Partial<ReturnType<typeof defaultFormData>>) =>
    setFormData((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    if (!accountId || !user) return
    setLoading(true)
    fetchEntityRecord('bankAccounts', accountId)
      .then((account) => {
        if (!account) throw new Error('Not found')
        const defaults = defaultFormData()
        setFormData({
          accountName: account.accountName,
          bankName: account.bankName,
          accountNumber: account.accountNumber || '',
          accountType: account.accountType || defaults.accountType,
          ownershipType: account.ownershipType || defaults.ownershipType,
          jointHolders: account.jointHolders || '',
          operationMode: account.operationMode || defaults.operationMode,
          ifscCode: account.ifscCode || '',
          branch: account.branch || '',
          nomineeName: account.nomineeName || '',
          balance: String(account.balance ?? 0),
          color: account.color || defaults.color,
        })
        setOriginalBalance(account.balance)
      })
      .catch(() => {
        toast.error('Failed to load account')
        router.push('/dashboard/accounts')
      })
      .finally(() => setLoading(false))
  }, [accountId, user, router])

  const displayName = `${formData.bankName.trim()} - ${formData.accountType}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const balance = Number(formData.balance) || 0
    const payload = {
      ...formData,
      balance,
      accountName: displayName,
      icon: '🏦',
      ifscCode: formData.ifscCode.trim().toUpperCase(),
      ...(formData.ownershipType === 'Individual' && { jointHolders: '', operationMode: '' }),
    }
    try {
      if (accountId) {
        await request.put(`/api/bank-accounts/${accountId}`, payload)
        toast.success('Account updated successfully')
        const balanceChanged =
          originalBalance !== null && balance !== originalBalance
        if (balanceChanged) {
          promptBalanceAdjustment(
            {
              previousBalance: originalBalance,
              newBalance: balance,
              isCash: false,
              accountId,
              accountName: displayName,
            },
            () => {
              if (onSuccess) onSuccess()
              else router.push('/dashboard/accounts')
            }
          )
          return
        }
      } else {
        await request.post('/api/bank-accounts', payload)
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
    return <FormSkeleton variant={variant} />
  }

  const isJoint = formData.ownershipType === 'Joint'

  return (
    <>
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection>
        <FormField label="Bank name" required>
          <Input
            value={formData.bankName}
            onChange={(e) => set({ bankName: e.target.value })}
            required
            placeholder="e.g., HDFC Bank"
          />
        </FormField>
        <FormField label="Account type">
          <select
            value={formData.accountType}
            onChange={(e) => set({ accountType: e.target.value })}
            className="form-select"
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Account number">
          <Input
            value={formData.accountNumber}
            onChange={(e) => set({ accountNumber: e.target.value })}
            placeholder="Account number"
            inputMode="numeric"
            autoComplete="off"
          />
        </FormField>
        <FormField label={accountId ? 'Balance' : 'Opening balance'}>
          <Input
            type="number"
            inputMode="decimal"
            value={formData.balance}
            onChange={(e) => set({ balance: e.target.value })}
            placeholder="0"
            step="0.01"
          />
        </FormField>

        <FormField label="Branch">
          <Input
            value={formData.branch}
            onChange={(e) => set({ branch: e.target.value })}
            placeholder="e.g., Andheri West, Mumbai"
          />
        </FormField>
        <FormField label="IFSC code">
          <Input
            value={formData.ifscCode}
            onChange={(e) => set({ ifscCode: e.target.value.toUpperCase() })}
            placeholder="e.g., HDFC0001234"
            maxLength={11}
            pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}"
            title="11 characters: 4 letters, a zero, then 6 letters or digits"
            autoComplete="off"
          />
        </FormField>

        <FormField label="Ownership">
          <ToggleButtonGroup
            value={formData.ownershipType}
            onValueChange={(ownershipType) => set({ ownershipType })}
            options={[
              { value: 'Individual', label: 'Individual' },
              { value: 'Joint', label: 'Joint' },
            ]}
          />
        </FormField>
        <FormField label="Nominee">
          <Input
            value={formData.nomineeName}
            onChange={(e) => set({ nomineeName: e.target.value })}
            placeholder="Nominee name"
          />
        </FormField>

        {isJoint && (
          <>
            <FormField label="Joint holders" hint="Separate names with commas">
              <Input
                value={formData.jointHolders}
                onChange={(e) => set({ jointHolders: e.target.value })}
                placeholder="e.g., Priya Sharma"
              />
            </FormField>
            <FormField label="Mode of operation">
              <select
                value={formData.operationMode}
                onChange={(e) => set({ operationMode: e.target.value })}
                className="form-select"
              >
                {OPERATION_MODES.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </FormField>
          </>
        )}

        <FormField label="Card color">
          <Input
            type="color"
            value={formData.color}
            onChange={(e) => set({ color: e.target.value })}
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
