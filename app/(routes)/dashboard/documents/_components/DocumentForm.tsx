'use client'

import { useEffect, useRef, useState } from 'react'
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
  category: 'identity',
  notes: '',
  fileName: '',
  storageKey: '',
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(!!documentId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (!documentId) return
    setLoading(true)
    request
      .get(`/api/documents/${documentId}`)
      .then((res) => {
        const doc = res.data
        setFormData({
          name: doc.name,
          category: doc.category || 'other',
          fileName: doc.fileName || '',
          storageKey: doc.storageKey || '',
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
        await request.put(`/api/documents/${documentId}`, {
          name: formData.name,
          category: formData.category,
          notes: formData.notes,
        })
        toast.success('Document updated')
      } else {
        if (!selectedFile) {
          toast.error('Please select a file to upload')
          setSaving(false)
          return
        }
        const payload = new FormData()
        payload.append('file', selectedFile)
        payload.append('name', formData.name)
        payload.append('category', formData.category)
        if (formData.notes) payload.append('notes', formData.notes)
        await request.post('/api/documents/upload', payload)
        toast.success('Document uploaded')
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
            placeholder="e.g., Aadhar Card, PAN, Health Policy"
          />
        </FormField>
        <FormField label="Category">
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="form-select"
          >
            <option value="identity">Identity (Aadhar, PAN)</option>
            <option value="insurance">Insurance</option>
            <option value="tax">Tax</option>
            <option value="investment">Investment</option>
            <option value="loan">Loan</option>
            <option value="receipt">Receipt</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        {!documentId ? (
          <FormField label="File" required span="full">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">PDF, JPEG, PNG, or Word — max 10MB</p>
          </FormField>
        ) : (
          formData.fileName && (
            <FormField label="Uploaded file">
              <p className="text-sm text-muted-foreground">{formData.fileName}</p>
            </FormField>
          )
        )}
        <FormField label="Notes (Optional)" span="full">
          <Input
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Policy number, locker location, etc."
          />
        </FormField>
      </FormSection>
      <FormSubmitBar
        variant={variant}
        submitLabel={documentId ? 'Update Document' : 'Upload Document'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
