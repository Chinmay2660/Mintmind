'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
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
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

const defaultFormData = () => ({
  type: 'Health',
  name: '',
  policyNumber: '',
  premium: 0,
  premiumFrequency: 'Yearly',
  startDate: new Date().toISOString().split('T')[0],
  renewalDate: '',
  endDate: '',
  coverageAmount: '',
  accountId: '',
  isActive: true,
  notes: '',
})

interface InsuranceFormProps extends EntityFormProps {
  insuranceId?: string
}

export function InsuranceForm({
  insuranceId,
  variant = 'page',
  onSuccess,
  onCancel,
}: InsuranceFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { accounts } = useBankAccounts(user?.id)
  const [loading, setLoading] = useState(!!insuranceId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!insuranceId || !user) return
    setLoading(true)
    fetchEntityRecord('insurance', insuranceId)
      .then((policy) => {
        if (!policy) throw new Error('Not found')
        setFormData({
          type: policy.type,
          name: policy.name,
          policyNumber: policy.policyNumber || '',
          premium: policy.premium,
          premiumFrequency: policy.premiumFrequency || 'Yearly',
          startDate: format(new Date(policy.startDate), 'yyyy-MM-dd'),
          renewalDate: policy.renewalDate ? format(new Date(policy.renewalDate), 'yyyy-MM-dd') : '',
          endDate: policy.endDate ? format(new Date(policy.endDate), 'yyyy-MM-dd') : '',
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
      if (onSuccess) onSuccess()
      else router.push('/dashboard/insurance')
    } catch {
      toast.error('Failed to save insurance policy')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection title="Policy details">
        <FormField label="Insurance Type">
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form-select"
          >
            <option value="Life">Life</option>
            <option value="Term Insurance">Term Insurance</option>
            <option value="Health">Health</option>
            <option value="Motor">Motor</option>
            <option value="Home">Home</option>
            <option value="Other">Other</option>
          </select>
        </FormField>
        <FormField label="Policy / Provider Name" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., HDFC Life, Star Health"
          />
        </FormField>
        <FormField label="Policy Number (Optional)">
          <Input
            value={formData.policyNumber}
            onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
            placeholder="Policy number"
          />
        </FormField>
        <FormField label="Premium Amount" required>
          <Input
            type="number"
            value={formData.premium || ''}
            onChange={(e) => setFormData({ ...formData, premium: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            required
            step="0.01"
            min="0"
          />
        </FormField>
        <FormField label="Premium Frequency">
          <select
            value={formData.premiumFrequency}
            onChange={(e) => setFormData({ ...formData, premiumFrequency: e.target.value })}
            className="form-select"
          >
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </FormField>
        <FormField label="Coverage Amount (Optional)">
          <Input
            type="number"
            value={formData.coverageAmount}
            onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
            step="0.01"
            min="0"
            placeholder="Sum insured"
          />
        </FormField>
      </FormSection>
      <FormSection title="Dates & payment">
        <FormField label="Start Date" required>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Renewal Date (Optional)">
          <Input
            type="date"
            value={formData.renewalDate}
            onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
          />
        </FormField>
        <FormField label={`End Date ${formData.type === 'Term Insurance' ? '' : '(Optional)'}`}>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required={formData.type === 'Term Insurance'}
          />
        </FormField>
        <FormField label="Payment Account (Optional)">
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
        <FormField label="Policy is active" span="full">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm font-medium">Active policy</span>
          </label>
        </FormField>
        <FormField label="Notes (Optional)" span="full">
          <Input
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes"
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={insuranceId ? 'Update Policy' : 'Add Policy'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
