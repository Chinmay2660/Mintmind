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
  FormRow,
  FormSection,
  FormSkeleton,
} from '@/components/ui/form-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

const GOAL_CATEGORIES = [
  'savings',
  'investment',
  'expense',
  'other',
  'marriage',
  'emergency',
  'car',
  'house',
  'vacation',
  'education',
  'retirement',
] as const

const defaultFormData = () => ({
  title: '',
  description: '',
  targetAmount: '',
  currentAmount: '',
  targetDate: '',
  category: 'savings' as (typeof GOAL_CATEGORIES)[number],
  monthlyContribution: '',
  expectedReturn: '8',
})

interface GoalFormProps extends EntityFormProps {
  goalId?: string
}

export function GoalForm({ goalId, variant = 'page', onSuccess, onCancel }: GoalFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!goalId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData())

  useEffect(() => {
    if (!goalId || !user) return
    setLoading(true)
    fetchEntityRecord('goals', goalId)
      .then((goal) => {
        if (!goal) throw new Error('Not found')
        setFormData({
          title: goal.title,
          description: goal.description || '',
          targetAmount: String(goal.targetAmount ?? ''),
          currentAmount: String(goal.currentAmount ?? ''),
          targetDate: goal.targetDate
            ? new Date(goal.targetDate).toISOString().split('T')[0]
            : '',
          category: goal.category || 'savings',
          monthlyContribution: String(goal.monthlyContribution ?? ''),
          expectedReturn: String(goal.expectedReturn ?? 8),
        })
      })
      .catch(() => {
        toast.error('Failed to load goal')
        router.push('/dashboard/goals')
      })
      .finally(() => setLoading(false))
  }, [goalId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title: formData.title,
      description: formData.description || undefined,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      targetDate: formData.targetDate || undefined,
      category: formData.category,
      monthlyContribution: parseFloat(formData.monthlyContribution) || 0,
      expectedReturn: parseFloat(formData.expectedReturn) || 8,
    }

    setSaving(true)
    try {
      if (goalId) {
        await request.put(`/api/goals/${goalId}`, payload)
        toast.success('Goal updated successfully')
      } else {
        await request.post('/api/goals', payload)
        toast.success('Goal created successfully')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/goals')
    } catch {
      toast.error('Failed to save goal')
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
            placeholder="e.g., Emergency fund"
          />
        </FormField>
        <FormField label="Description (Optional)" span="full">
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What is this goal for?"
          />
        </FormField>
        <FormRow>
          <FormField label="Target Amount" required>
            <Input
              type="number"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              required
              min="0"
              step="0.01"
              placeholder="100000"
            />
          </FormField>
          <FormField label="Current Amount">
            <Input
              type="number"
              value={formData.currentAmount}
              onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
              min="0"
              step="0.01"
              placeholder="0"
            />
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="Target Date (Optional)">
            <Input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            />
          </FormField>
          <FormField label="Category">
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as (typeof GOAL_CATEGORIES)[number],
                })
              }
              className="form-select"
            >
              {GOAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="Monthly Contribution">
            <Input
              type="number"
              value={formData.monthlyContribution}
              onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
              min="0"
              step="0.01"
              placeholder="5000"
            />
          </FormField>
          <FormField label="Expected Return (% p.a.)">
            <Input
              type="number"
              value={formData.expectedReturn}
              onChange={(e) => setFormData({ ...formData, expectedReturn: e.target.value })}
              min="0"
              step="0.1"
              placeholder="8"
            />
          </FormField>
        </FormRow>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={goalId ? 'Update Goal' : 'Create Goal'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
