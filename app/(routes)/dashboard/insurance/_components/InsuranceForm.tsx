'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { useAuth } from '@/lib/hooks/useAuth'

const defaultFormData = () => ({
  type: 'Health',
  name: '',
  policyNumber: '',
  premium: 0,
  premiumFrequency: 'Yearly',
  startDate: new Date().toISOString().split('T')[0],
  renewalDate: '',
  coverageAmount: '',
  accountId: '',
  isActive: true,
  notes: '',
})

interface InsuranceFormProps {
  insuranceId?: string
}

export function InsuranceForm({ insuranceId }: InsuranceFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<{ _id: string; icon?: string; accountName: string }[]>([])
  const [loading, setLoading] = useState(!!insuranceId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!user) return
    request.get('/api/bank-accounts').then((res) => setAccounts(res.data)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!insuranceId || !user) return
    setLoading(true)
    request
      .get(`/api/insurance/${insuranceId}`)
      .then((res) => {
        const policy = res.data
        setFormData({
          type: policy.type,
          name: policy.name,
          policyNumber: policy.policyNumber || '',
          premium: policy.premium,
          premiumFrequency: policy.premiumFrequency || 'Yearly',
          startDate: format(new Date(policy.startDate), 'yyyy-MM-dd'),
          renewalDate: policy.renewalDate ? format(new Date(policy.renewalDate), 'yyyy-MM-dd') : '',
          coverageAmount: policy.coverageAmount || '',
          accountId: policy.accountId?._id || '',
          isActive: policy.isActive !== false,
          notes: policy.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load insurance policy')
        router.push('/dashboard/insurance')
      })
      .finally(() => setLoading(false))
  }, [insuranceId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        coverageAmount: formData.coverageAmount ? parseFloat(formData.coverageAmount) : null,
        accountId: formData.accountId || null,
      }
      if (insuranceId) {
        await request.put(`/api/insurance/${insuranceId}`, payload)
        toast.success('Insurance policy updated')
      } else {
        await request.post('/api/insurance', payload)
        toast.success('Insurance policy added')
      }
      router.push('/dashboard/insurance')
    } catch {
      toast.error('Failed to save insurance policy')
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
        <label className="text-sm font-medium mb-1 block">Insurance Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="Life">Life</option>
          <option value="Health">Health</option>
          <option value="Motor">Motor</option>
          <option value="Home">Home</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Policy / Provider Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., HDFC Life, Star Health"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Policy Number (Optional)</label>
        <Input
          value={formData.policyNumber}
          onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
          placeholder="Policy number"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Premium Amount</label>
        <Input
          type="number"
          value={formData.premium}
          onChange={(e) => setFormData({ ...formData, premium: parseFloat(e.target.value) || 0 })}
          required
          step="0.01"
          min="0"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Premium Frequency</label>
        <select
          value={formData.premiumFrequency}
          onChange={(e) => setFormData({ ...formData, premiumFrequency: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Yearly">Yearly</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Start Date</label>
        <Input
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Renewal Date (Optional)</label>
        <Input
          type="date"
          value={formData.renewalDate}
          onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Coverage Amount (Optional)</label>
        <Input
          type="number"
          value={formData.coverageAmount}
          onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
          step="0.01"
          min="0"
          placeholder="Sum insured"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Payment Account (Optional)</label>
        <select
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select account</option>
          {accounts.map((acc) => (
            <option key={acc._id} value={acc._id}>
              {acc.icon} {acc.accountName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="w-4 h-4 rounded border-border"
        />
        <label htmlFor="isActive" className="text-sm font-medium">Policy is active</label>
      </div>
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
          {insuranceId ? 'Update Policy' : 'Add Policy'}
        </SubmitButton>
      </div>
    </form>
  )
}
