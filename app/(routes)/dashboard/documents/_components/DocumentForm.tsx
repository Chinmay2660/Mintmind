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
  name: '',
  category: 'other',
  fileName: '',
  notes: '',
})

interface DocumentFormProps extends EntityFormProps {
  documentId?: string
}

export function DocumentForm({
  documentId,
  variant = 'page',
  onSuccess,
  onCancel,
}: DocumentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(!!documentId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!documentId) return
    setLoading(true)
    request
      .get(`/api/documents/${documentId}`)
      .then((doc) => {
        setFormData({
          name: doc.name,
          category: doc.category || 'other',
          fileName: doc.fileName || '',
          notes: doc.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load document')
        router.push('/dashboard/documents')
      })
      .finally(() => setLoading(false))
  }, [documentId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (documentId) {
        await request.put(`/api/documents/${documentId}`, formData)
        toast.success('Document updated')
      } else {
        await request.post('/api/documents', formData)
        toast.success('Document added')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/documents')
    } catch {
      toast.error('Failed to save document')
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
        <FormField label="Document Name" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Health Insurance Policy"
          />
        </FormField>
        <FormField label="Category">
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="form-select"
          >
            <option value="insurance">Insurance</option>
            <option value="tax">Tax</option>
            <option value="investment">Investment</option>
            <option value="loan">Loan</option>
            <option value="receipt">Receipt</option>
            <option value="identity">Identity</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        <FormField label="File Name (Metadata)">
          <Input
            value={formData.fileName}
            onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
            placeholder="e.g., policy-2024.pdf"
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
        submitLabel={documentId ? 'Update Document' : 'Add Document'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
