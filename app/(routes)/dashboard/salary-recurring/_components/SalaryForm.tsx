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
import { useCategories, useBankAccounts } from '@/lib/hooks/useReferenceData'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

const defaultFormData = () => ({
  amount: '',
  currency: 'INR',
  frequency: 'monthly',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  description: '',
  accountId: '',
  categoryId: '',
})

interface SalaryFormProps extends EntityFormProps {
  salaryId?: string
}

export function SalaryForm({ salaryId, variant = 'page', onSuccess, onCancel }: SalaryFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { accounts } = useBankAccounts(user?.id)
  const [loading, setLoading] = useState(!!salaryId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  const incomeCategories = categories.filter((cat) => cat.type === 'income')

  useEffect(() => {
    if (!salaryId || !user) return
    setLoading(true)
    fetchEntityRecord('salary', salaryId)
      .then((salary) => {
        if (!salary) throw new Error('Not found')
        setFormData({
          amount: salary.amount,
          currency: salary.currency || 'INR',
          frequency: salary.frequency,
          startDate: format(new Date(salary.startDate), 'yyyy-MM-dd'),
          endDate: salary.endDate ? format(new Date(salary.endDate), 'yyyy-MM-dd') : '',
          description: salary.description || '',
          accountId: salary.accountId?._id || '',
          categoryId: salary.categoryId?._id || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load salary')
        router.push('/dashboard/salary-recurring')
      })
      .finally(() => setLoading(false))
  }, [salaryId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (salaryId) {
        await request.put(`/api/salary/${salaryId}`, formData)
        toast.success('Salary updated successfully')
      } else {
        await request.post('/api/salary', formData)
        toast.success('Salary added successfully')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/salary-recurring')
    } catch {
      toast.error('Failed to save salary')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection>
        <FormField label="Amount" required>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0"
            required
            step="0.01"
            min="0"
          />
        </FormField>
        <FormField label="Frequency">
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            className="form-select"
          >
            <option value="monthly">Monthly</option>
            <option value="bi-weekly">Bi-weekly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
          </select>
        </FormField>
        <FormField label="Start Date" required>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </FormField>
        <FormField label="End Date (Optional)">
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </FormField>
        <FormField label="Category (Optional)">
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="form-select"
          >
            <option value="">Select category</option>
            {incomeCategories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Account (Optional)">
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
        <FormField label="Description (Optional)" span="full">
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., Software Engineer Salary"
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={salaryId ? 'Update Salary' : 'Add Salary'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
