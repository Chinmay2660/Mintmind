'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { useCategories } from '@/lib/hooks/useReferenceData'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

const calculateEndDate = (startDate: string, period: string) => {
  if (!startDate) return ''
  const date = new Date(startDate)
  switch (period) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'half-yearly':
      date.setMonth(date.getMonth() + 6)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  return date.toISOString().split('T')[0]
}

const defaultFormData = () => ({
  categoryId: '',
  name: '',
  amount: '',
  period: 'monthly',
  startDate: '',
  endDate: '',
  description: '',
})

interface BudgetFormProps extends EntityFormProps {
  budgetId?: string
}

export function BudgetForm({ budgetId, variant = 'page', onSuccess, onCancel }: BudgetFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { categories: allCategories } = useCategories(user?.id)
  const categories = allCategories.filter((c) => c.type === 'expense')
  const [loading, setLoading] = useState(!!budgetId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!budgetId || !user) return
    setLoading(true)
    fetchEntityRecord('budgets', budgetId)
      .then((budget) => {
        if (!budget) throw new Error('Not found')
        setFormData({
          categoryId: budget.categoryId._id,
          name: budget.name,
          amount: budget.amount,
          period: budget.period,
          startDate: new Date(budget.startDate).toISOString().split('T')[0],
          endDate: new Date(budget.endDate).toISOString().split('T')[0],
          description: budget.description || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load budget')
        router.push('/dashboard/budgets')
      })
      .finally(() => setLoading(false))
  }, [budgetId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (budgetId) {
        await request.put(`/api/budgets/${budgetId}`, formData)
        toast.success('Budget updated successfully')
      } else {
        await request.post('/api/budgets', formData)
        toast.success('Budget created successfully')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/budgets')
    } catch {
      toast.error('Failed to save budget')
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
        <FormField label="Budget Name" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Car Maintenance"
            required
          />
        </FormField>
        <FormField label="Category" required>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="form-select"
            required
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Amount" required>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="200000"
            required
            min="0"
            step="0.01"
          />
        </FormField>
        <FormField label="Period" required>
          <select
            value={formData.period}
            onChange={(e) => {
              const newPeriod = e.target.value
              setFormData({
                ...formData,
                period: newPeriod,
                endDate: formData.startDate ? calculateEndDate(formData.startDate, newPeriod) : '',
              })
            }}
            className="form-select"
            required
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly (3 Months)</option>
            <option value="half-yearly">Half-Yearly (6 Months)</option>
            <option value="yearly">Yearly</option>
          </select>
        </FormField>
        <FormField label="Start Date" required>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => {
              const newStartDate = e.target.value
              setFormData({
                ...formData,
                startDate: newStartDate,
                endDate: calculateEndDate(newStartDate, formData.period),
              })
            }}
            required
          />
        </FormField>
        <FormField label="End Date" required>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Description (Optional)" span="full">
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional notes..."
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={budgetId ? 'Update Budget' : 'Create Budget'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
