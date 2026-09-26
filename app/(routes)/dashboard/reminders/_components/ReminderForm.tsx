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
  title: '',
  type: 'other',
  dueDate: new Date().toISOString().split('T')[0],
  amount: 0,
  status: 'upcoming',
  notes: '',
})

interface ReminderFormProps extends EntityFormProps {
  reminderId?: string
}

export function ReminderForm({ reminderId, variant = 'page', onSuccess, onCancel }: ReminderFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!reminderId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!reminderId || !user) return
    setLoading(true)
    fetchEntityRecord('reminders', reminderId)
      .then((reminder) => {
        if (!reminder) throw new Error('Not found')
        setFormData({
          title: reminder.title,
          type: reminder.type || 'other',
          dueDate: format(new Date(reminder.dueDate), 'yyyy-MM-dd'),
          amount: reminder.amount || 0,
          status: reminder.status || 'upcoming',
          notes: reminder.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load reminder')
        router.push('/dashboard/reminders')
      })
      .finally(() => setLoading(false))
  }, [reminderId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        amount: formData.amount || null,
      }
      if (reminderId) {
        await request.put(`/api/reminders/${reminderId}`, payload)
        toast.success('Reminder updated')
      } else {
        await request.post('/api/reminders', payload)
        toast.success('Reminder added')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/reminders')
    } catch {
      toast.error('Failed to save reminder')
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
        <FormField label="Title" required>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="e.g., Credit card payment"
          />
        </FormField>
        <FormField label="Type">
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form-select"
          >
            <option value="emi">EMI</option>
            <option value="credit_card">Credit Card</option>
            <option value="insurance">Insurance</option>
            <option value="investment">Investment</option>
            <option value="sip">SIP</option>
            <option value="bill">Bill</option>
            <option value="subscription">Subscription</option>
            <option value="policy">Policy</option>
            <option value="loan">Loan</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        <FormField label="Due Date" required>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Amount (Optional)">
          <Input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            step="0.01"
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Status">
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="form-select"
          >
            <option value="upcoming">Upcoming</option>
            <option value="today">Today</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
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
        submitLabel={reminderId ? 'Update Reminder' : 'Add Reminder'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
