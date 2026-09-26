'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { IconPicker } from '@/components/ui/icon-picker'
import { FormSubmitBar } from '@/components/ui/form-buttons'
import {
  FormField,
  FormLayout,
  FormSection,
  FormSkeleton,
} from '@/components/ui/form-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import { DEFAULT_CATEGORY_COLOR } from '@/lib/constants/colors'
import { useCategories } from '@/lib/hooks/useReferenceData'
import type { EntityFormProps } from '@/lib/forms/types'

const defaultFormData = (type = 'expense') => ({
  name: '',
  type,
  icon: '📁',
  color: DEFAULT_CATEGORY_COLOR,
  budget: 0,
  parentId: '',
})

interface CategoryFormProps extends EntityFormProps {
  categoryId?: string
  defaultType?: 'expense' | 'income'
}

export function CategoryForm({
  categoryId,
  defaultType,
  variant = 'page',
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const parentOptions = categories.filter((c) => !c.parentId && c._id !== categoryId)
  const [loading, setLoading] = useState(!!categoryId)
  const [saving, setSaving] = useState(false)
  const initialType =
    defaultType ?? (searchParams.get('type') === 'income' ? 'income' : 'expense')
  const [formData, setFormData] = useState(defaultFormData(initialType))

  useEffect(() => {
    if (!categoryId || !user) return
    setLoading(true)
    fetchEntityRecord('categories', categoryId)
      .then((cat) => {
        if (!cat) throw new Error('Not found')
        setFormData({
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          budget: cat.budget || 0,
          parentId: cat.parentId?._id || cat.parentId || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load category')
        router.push('/dashboard/categories')
      })
      .finally(() => setLoading(false))
  }, [categoryId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...formData, parentId: formData.parentId || null }
      if (categoryId) {
        await request.put(`/api/categories/${categoryId}`, payload)
        toast.success('Category updated successfully')
      } else {
        await request.post('/api/categories', payload)
        toast.success('Category added successfully')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/categories')
    } catch {
      toast.error('Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton variant={variant} />
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection title="Category details">
        <FormField label="Type" span="compact">
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form-select"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </FormField>
        {parentOptions.length > 0 && (
          <FormField label="Parent Category (optional — for subcategories)" span="compact">
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="form-select"
            >
              <option value="">None (top-level)</option>
              {parentOptions.filter((c) => c.type === formData.type).map((c) => (
                <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label={formData.parentId ? 'Subcategory Name' : 'Category Name'} required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Groceries, Salary"
          />
        </FormField>
        {formData.type === 'expense' && (
          <FormField label="Budget (Optional)" span="compact">
            <Input
              type="number"
              value={formData.budget || ''}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
              step="0.01"
              min="0"
              placeholder="0"
            />
          </FormField>
        )}
      </FormSection>
      <FormSection title="Appearance">
        <FormField label="Icon" span="icon">
          <IconPicker
            value={formData.icon}
            onChange={(icon) => setFormData({ ...formData, icon })}
          />
        </FormField>
        <FormField label="Color" span="color">
          <Input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-10 w-full cursor-pointer p-1"
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={categoryId ? 'Update Category' : 'Add Category'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
