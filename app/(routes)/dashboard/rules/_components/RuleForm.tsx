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
import { TagBadge } from '@/components/ui/tag-badge'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCategories } from '@/lib/hooks/useReferenceData'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

const defaultFormData = () => ({
  name: '',
  enabled: true,
  priority: 0,
  conditions: {
    field: 'description' as 'description' | 'amount',
    operator: 'contains' as 'contains' | 'equals' | 'startsWith' | 'greaterThan' | 'lessThan',
    value: '',
  },
  actions: {
    categoryId: '',
    tagIds: [] as string[],
  },
})

interface RuleFormProps extends EntityFormProps {
  ruleId?: string
}

export function RuleForm({ ruleId, variant = 'page', onSuccess, onCancel }: RuleFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const { categories: allCategories } = useCategories(userId)
  const { data: tags } = useLocalList('tags', userId)
  const categories = allCategories.filter((c) => c.type === 'expense')
  const [loading, setLoading] = useState(!!ruleId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData())

  useEffect(() => {
    if (!ruleId || !user) return
    setLoading(true)
    fetchEntityRecord('rules', ruleId)
      .then((rule) => {
        if (!rule) throw new Error('Not found')
        const categoryId = rule.actions?.categoryId
        setFormData({
          name: rule.name,
          enabled: rule.enabled !== false,
          priority: rule.priority ?? 0,
          conditions: {
            field: rule.conditions?.field || 'description',
            operator: rule.conditions?.operator || 'contains',
            value: rule.conditions?.value || '',
          },
          actions: {
            categoryId: typeof categoryId === 'object' ? categoryId?._id : categoryId || '',
            tagIds: (rule.actions?.tagIds || []).map((tag: { _id?: string } | string) =>
              typeof tag === 'object' ? tag._id : tag
            ),
          },
        })
      })
      .catch(() => {
        toast.error('Failed to load rule')
        router.push('/dashboard/rules')
      })
      .finally(() => setLoading(false))
  }, [ruleId, user, router])

  const toggleTag = (tagId: string) => {
    setFormData((prev) => {
      const tagIds = prev.actions.tagIds.includes(tagId)
        ? prev.actions.tagIds.filter((id) => id !== tagId)
        : [...prev.actions.tagIds, tagId]
      return { ...prev, actions: { ...prev.actions, tagIds } }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.conditions.value.trim()) {
      toast.error('Condition value is required')
      return
    }

    const payload = {
      ...formData,
      actions: {
        ...formData.actions,
        categoryId: formData.actions.categoryId || undefined,
        tagIds: formData.actions.tagIds,
      },
    }

    setSaving(true)
    try {
      if (ruleId) {
        await request.put(`/api/rules/${ruleId}`, payload)
        toast.success('Rule updated successfully')
      } else {
        await request.post('/api/rules', payload)
        toast.success('Rule created successfully')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/rules')
    } catch {
      toast.error('Failed to save rule')
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
        <FormField label="Rule Name" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Grocery stores"
          />
        </FormField>
        <FormRow>
          <FormField label="Priority">
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })
              }
            />
          </FormField>
          <FormField label="Enabled">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer h-10">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Rule is enabled
            </label>
          </FormField>
        </FormRow>
      </FormSection>

      <FormSection title="Conditions">
        <FormField label="Field">
          <select
            value={formData.conditions.field}
            onChange={(e) =>
              setFormData({
                ...formData,
                conditions: {
                  ...formData.conditions,
                  field: e.target.value as 'description' | 'amount',
                },
              })
            }
            className="form-select"
          >
            <option value="description">Description</option>
            <option value="amount">Amount</option>
          </select>
        </FormField>
        <FormField label="Operator">
          <select
            value={formData.conditions.operator}
            onChange={(e) =>
              setFormData({
                ...formData,
                conditions: {
                  ...formData.conditions,
                  operator: e.target.value as typeof formData.conditions.operator,
                },
              })
            }
            className="form-select"
          >
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="startsWith">Starts with</option>
            <option value="greaterThan">Greater than</option>
            <option value="lessThan">Less than</option>
          </select>
        </FormField>
        <FormField label="Value" required>
          <Input
            value={formData.conditions.value}
            onChange={(e) =>
              setFormData({
                ...formData,
                conditions: { ...formData.conditions, value: e.target.value },
              })
            }
            required
            placeholder="e.g., Swiggy"
          />
        </FormField>
      </FormSection>

      <FormSection title="Actions">
        <FormField label="Category">
          <select
            value={formData.actions.categoryId}
            onChange={(e) =>
              setFormData({
                ...formData,
                actions: { ...formData.actions, categoryId: e.target.value },
              })
            }
            className="form-select"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tags" span="full">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags available. Create tags first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = formData.actions.tagIds.includes(tag._id)
                return (
                  <button
                    key={tag._id}
                    type="button"
                    onClick={() => toggleTag(tag._id)}
                    className={`rounded-full transition-opacity ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <TagBadge name={tag.name} color={tag.color} className="text-sm px-3 py-1" />
                  </button>
                )
              })}
            </div>
          )}
        </FormField>
      </FormSection>

      <FormSubmitBar
        variant={variant}
        submitLabel={ruleId ? 'Update Rule' : 'Create Rule'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
