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
import type { EntityFormProps } from '@/lib/forms/types'

const defaultFormData = () => ({
  service: '',
  username: '',
  password: '',
  url: '',
  category: 'general',
  notes: '',
})

interface PasswordFormProps extends EntityFormProps {
  passwordId?: string
}

export function PasswordForm({
  passwordId,
  variant = 'page',
  onSuccess,
  onCancel,
}: PasswordFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(!!passwordId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!passwordId) return
    setLoading(true)
    request
      .get(`/api/passwords/${passwordId}`)
      .then((entry) => {
        setFormData({
          service: entry.service,
          username: entry.username || '',
          password: entry.password || '',
          url: entry.url || '',
          category: entry.category || 'general',
          notes: entry.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load password entry')
        router.push('/dashboard/passwords')
      })
      .finally(() => setLoading(false))
  }, [passwordId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...formData }
      if (passwordId && !payload.password) {
        delete (payload as { password?: string }).password
      }
      if (passwordId) {
        await request.put(`/api/passwords/${passwordId}`, payload)
        toast.success('Password entry updated')
      } else {
        if (!payload.password) {
          toast.error('Password is required')
          setSaving(false)
          return
        }
        await request.post('/api/passwords', payload)
        toast.success('Password entry added')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/passwords')
    } catch {
      toast.error('Failed to save password entry')
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
        <FormField label="Service" required>
          <Input
            value={formData.service}
            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            required
            placeholder="e.g., Gmail, Netflix"
          />
        </FormField>
        <FormField label="Username">
          <Input
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Email or username"
          />
        </FormField>
        <FormField label={`Password ${passwordId ? '(leave blank to keep current)' : ''}`} required={!passwordId}>
          <Input
            type="text"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!passwordId}
            placeholder="Enter password"
            autoComplete="off"
          />
        </FormField>
        <FormField label="URL">
          <Input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://..."
          />
        </FormField>
        <FormField label="Category">
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="general"
          />
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
        submitLabel={passwordId ? 'Update Entry' : 'Add Entry'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
