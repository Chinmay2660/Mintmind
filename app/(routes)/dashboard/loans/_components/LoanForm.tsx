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
  name: '',
  type: 'home',
  lender: '',
  principal: 0,
  outstanding: 0,
  interestRate: 0,
  emi: 0,
  tenureMonths: 0,
  remainingMonths: 0,
  startDate: new Date().toISOString().split('T')[0],
  notes: '',
})

interface LoanFormProps extends EntityFormProps {
  loanId?: string
}

export function LoanForm({ loanId, variant = 'page', onSuccess, onCancel }: LoanFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!loanId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!loanId || !user) return
    setLoading(true)
    fetchEntityRecord('loans', loanId)
      .then((loan) => {
        if (!loan) throw new Error('Not found')
        setFormData({
          name: loan.name,
          type: loan.type || 'home',
          lender: loan.lender || '',
          principal: loan.principal || 0,
          outstanding: loan.outstanding || 0,
          interestRate: loan.interestRate || 0,
          emi: loan.emi || 0,
          tenureMonths: loan.tenureMonths || 0,
          remainingMonths: loan.remainingMonths || 0,
          startDate: loan.startDate
            ? format(new Date(loan.startDate), 'yyyy-MM-dd')
            : new Date().toISOString().split('T')[0],
          notes: loan.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load loan')
        router.push('/dashboard/loans')
      })
      .finally(() => setLoading(false))
  }, [loanId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (loanId) {
        await request.put(`/api/loans/${loanId}`, formData)
        toast.success('Loan updated')
      } else {
        await request.post('/api/loans', formData)
        toast.success('Loan added')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/loans')
    } catch {
      toast.error('Failed to save loan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection title="Loan details">
        <FormField label="Loan Name" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Home Loan - HDFC"
          />
        </FormField>
        <FormField label="Type">
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form-select"
          >
            <option value="home">Home</option>
            <option value="personal">Personal</option>
            <option value="car">Car</option>
            <option value="education">Education</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        <FormField label="Lender">
          <Input
            value={formData.lender}
            onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
            placeholder="Bank or lender name"
          />
        </FormField>
        <FormField label="Start Date">
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </FormField>
      </FormSection>
      <FormSection title="Amounts & terms">
        <FormField label="Principal Amount" required>
          <Input
            type="number"
            value={formData.principal || ''}
            onChange={(e) => setFormData({ ...formData, principal: parseFloat(e.target.value) || 0 })}
            required
            step="0.01"
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Outstanding Balance" required>
          <Input
            type="number"
            value={formData.outstanding || ''}
            onChange={(e) => setFormData({ ...formData, outstanding: parseFloat(e.target.value) || 0 })}
            required
            step="0.01"
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Interest Rate (%)" required>
          <Input
            type="number"
            value={formData.interestRate || ''}
            onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
            required
            step="0.01"
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="EMI">
          <Input
            type="number"
            value={formData.emi || ''}
            onChange={(e) => setFormData({ ...formData, emi: parseFloat(e.target.value) || 0 })}
            step="0.01"
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Tenure (Months)">
          <Input
            type="number"
            value={formData.tenureMonths || ''}
            onChange={(e) => setFormData({ ...formData, tenureMonths: parseInt(e.target.value, 10) || 0 })}
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Remaining Months">
          <Input
            type="number"
            value={formData.remainingMonths || ''}
            onChange={(e) => setFormData({ ...formData, remainingMonths: parseInt(e.target.value, 10) || 0 })}
            min="0"
            placeholder="0"
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
        submitLabel={loanId ? 'Update Loan' : 'Add Loan'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
