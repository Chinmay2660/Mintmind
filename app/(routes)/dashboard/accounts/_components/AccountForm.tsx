'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { IconPicker } from '@/components/ui/icon-picker'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { useAuth } from '@/lib/hooks/useAuth'

const defaultFormData = () => ({
  accountName: '',
  bankName: '',
  accountNumber: '',
  accountType: 'Savings',
  balance: 0,
  color: '#2563eb',
  icon: '🏦',
})

interface AccountFormProps {
  accountId?: string
}

export function AccountForm({ accountId }: AccountFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!accountId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!accountId || !user) return
    setLoading(true)
    request
      .get(`/api/bank-accounts/${accountId}`)
      .then((res) => {
        const account = res.data
        setFormData({
          accountName: account.accountName,
          bankName: account.bankName,
          accountNumber: account.accountNumber || '',
          accountType: account.accountType,
          balance: account.balance,
          color: account.color,
          icon: account.icon,
        })
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
      } else {
        await request.post('/api/bank-accounts', formData)
        toast.success('Account added successfully')
      }
      router.push('/dashboard/accounts')
    } catch {
      toast.error('Failed to save account')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="surface-card p-6 animate-pulse h-64" />
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-4 md:p-6 space-y-4 max-w-2xl">
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Account Name</label>
        <Input
          value={formData.accountName}
          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          required
          placeholder="e.g., HDFC Savings"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Bank Name</label>
        <Input
          value={formData.bankName}
          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
          required
          placeholder="e.g., HDFC Bank"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Account Number (Optional)</label>
        <Input
          value={formData.accountNumber}
          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
          placeholder="Account number"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Account Type</label>
        <select
          value={formData.accountType}
          onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="Savings">Savings</option>
          <option value="Current">Current</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Initial Balance</label>
        <Input
          type="number"
          value={formData.balance}
          onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
          required
          step="0.01"
          className="h-12"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">Icon</label>
          <IconPicker
            value={formData.icon}
            onChange={(icon) => setFormData({ ...formData, icon })}
            className="h-12"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">Color</label>
          <Input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-12 w-full"
          />
        </div>
      </div>
      <FormButtonGroup
        submitLabel={accountId ? 'Update Account' : 'Add Account'}
        onCancel={() => router.push('/dashboard/accounts')}
        isLoading={saving}
        submitClassName="h-12"
        cancelClassName="h-12"
      />
    </form>
  )
}
