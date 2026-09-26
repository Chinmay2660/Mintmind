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
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

const defaultFormData = () => ({
  name: '',
  amount: 0,
  frequency: 'monthly',
  nextBillingDate: '',
  status: 'active',
  notes: '',
})

interface SubscriptionFormProps extends EntityFormProps {
  subscriptionId?: string
}

export function SubscriptionForm({
  subscriptionId,
  variant = 'page',
  onSuccess,
  onCancel,
}: SubscriptionFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!subscriptionId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!subscriptionId || !user) return
    setLoading(true)
    fetchEntityRecord('subscriptions', subscriptionId)
      .then((sub) => {
        if (!sub) throw new Error('Not found')
        setFormData({
          name: sub.name,
          amount: sub.amount || 0,
          frequency: sub.frequency || 'monthly',
          nextBillingDate: sub.nextBillingDate
            ? format(new Date(sub.nextBillingDate), 'yyyy-MM-dd')
            : '',
          status: sub.status || 'active',
          notes: sub.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load subscription')
        router.push('/dashboard/subscriptions')
      })
      .finally(() => setLoading(false))
  }, [subscriptionId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        nextBillingDate: formData.nextBillingDate || null,
      }
      if (subscriptionId) {
        await request.put(`/api/subscriptions/${subscriptionId}`, payload)
        toast.success('Subscription updated')
      } else {
        await request.post('/api/subscriptions', payload)
        toast.success('Subscription added')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/subscriptions')
    } catch {
      toast.error('Failed to save subscription')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton variant={variant} />
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection>
        <FormField label="Name" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Netflix, Spotify"
          />
        </FormField>
        <FormField label="Amount" required>
          <Input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            required
            step="0.01"
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Frequency">
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            className="form-select"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </FormField>
        <FormField label="Next Billing Date">
          <Input
            type="date"
            value={formData.nextBillingDate}
            onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
          />
        </FormField>
        <FormField label="Status">
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="form-select"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
        submitLabel={subscriptionId ? 'Update Subscription' : 'Add Subscription'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
