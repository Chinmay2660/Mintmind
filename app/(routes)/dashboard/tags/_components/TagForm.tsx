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
import { TagBadge } from '@/components/ui/tag-badge'
import { useAuth } from '@/lib/hooks/useAuth'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

const DEFAULT_TAG_COLOR = '#6366f1'

const defaultFormData = () => ({
  name: '',
  color: DEFAULT_TAG_COLOR,
})

interface TagFormProps extends EntityFormProps {
  tagId?: string
}

export function TagForm({ tagId, variant = 'page', onSuccess, onCancel }: TagFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!tagId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData())

  useEffect(() => {
    if (!tagId || !user) return
    setLoading(true)
    fetchEntityRecord('tags', tagId)
      .then((tag) => {
        if (!tag) throw new Error('Not found')
        setFormData({
          name: tag.name,
          color: tag.color || DEFAULT_TAG_COLOR,
        })
      })
      .catch(() => {
        toast.error('Failed to load tag')
        router.push('/dashboard/tags')
      })
      .finally(() => setLoading(false))
  }, [tagId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (tagId) {
        await request.put(`/api/tags/${tagId}`, formData)
        toast.success('Tag updated successfully')
      } else {
        await request.post('/api/tags', formData)
        toast.success('Tag added successfully')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/tags')
    } catch {
      toast.error('Failed to save tag')
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
        <FormField label="Tag Name" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Travel, Business"
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
        {formData.name && (
          <FormField label="Preview">
            <TagBadge name={formData.name} color={formData.color} className="text-sm px-3 py-1" />
          </FormField>
        )}
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={tagId ? 'Update Tag' : 'Add Tag'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
