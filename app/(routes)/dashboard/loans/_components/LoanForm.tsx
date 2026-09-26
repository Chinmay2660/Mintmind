'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { ToggleButtonGroup } from '@/components/ui/toggle-button'
import { useAuth } from '@/lib/hooks/useAuth'
import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import { calculateEmi, buildLoanSummary } from '@/lib/utils/loans'
import { formatCurrency } from '@/lib/utils/format'
import type { EntityFormProps } from '@/lib/forms/types'

type CoBorrower = { name: string; sharePercent: number }

const defaultFormData = () => ({
  name: '',
  type: 'home',
  lender: '',
  principal: 0,
  outstanding: 0,
  interestRate: 0,
  emi: 0,
  currentEmi: 0,
  tenureMonths: 0,
  remainingMonths: 0,
  startDate: new Date().toISOString().split('T')[0],
  ownership: 'individual' as 'individual' | 'joint',
  coBorrowers: [] as CoBorrower[],
  interestType: 'reducing' as 'reducing' | 'flat',
  isCash: false,
  accountId: '',
  notes: '',
})

interface LoanFormProps extends EntityFormProps {
  loanId?: string
}

export function LoanForm({ loanId, variant = 'page', onSuccess, onCancel }: LoanFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { accounts } = useBankAccounts(user?.id)
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
          currentEmi: loan.currentEmi || loan.emi || 0,
          tenureMonths: loan.tenureMonths || 0,
          remainingMonths: loan.remainingMonths || 0,
          startDate: loan.startDate
            ? format(new Date(loan.startDate), 'yyyy-MM-dd')
            : new Date().toISOString().split('T')[0],
          ownership: loan.ownership || 'individual',
          coBorrowers: loan.coBorrowers || [],
          interestType: loan.interestType || 'reducing',
          isCash: loan.isCash ?? false,
          accountId: typeof loan.accountId === 'object' ? loan.accountId?._id || '' : loan.accountId || '',
          notes: loan.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load loan')
        router.push('/dashboard/loans')
      })
      .finally(() => setLoading(false))
  }, [loanId, user, router])

  const projected = useMemo(
    () =>
      buildLoanSummary({
        principal: formData.principal,
        outstanding: formData.outstanding || formData.principal,
        interestRate: formData.interestRate,
        tenureMonths: formData.tenureMonths,
        emi: formData.emi,
        remainingMonths: formData.remainingMonths,
      }),
    [formData]
  )

  const autoFillEmi = () => {
    if (formData.principal > 0 && formData.tenureMonths > 0) {
      const emi = calculateEmi(formData.principal, formData.interestRate, formData.tenureMonths)
      const rounded = Math.round(emi * 100) / 100
      setFormData((prev) => ({
        ...prev,
        emi: rounded,
        currentEmi: prev.currentEmi || rounded,
        outstanding: prev.outstanding || prev.principal,
        remainingMonths: prev.remainingMonths || prev.tenureMonths,
      }))
    }
  }

  const addCoBorrower = () => {
    setFormData({
      ...formData,
      coBorrowers: [...formData.coBorrowers, { name: '', sharePercent: 50 }],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        accountId: formData.isCash ? null : formData.accountId || null,
        coBorrowers: formData.ownership === 'joint' ? formData.coBorrowers : [],
      }
      if (loanId) {
        await request.put(`/api/loans/${loanId}`, payload)
        toast.success('Loan updated')
      } else {
        await request.post('/api/loans', {
          ...payload,
          outstanding: payload.outstanding || payload.principal,
          remainingMonths: payload.remainingMonths || payload.tenureMonths,
        })
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
    return <FormSkeleton variant={variant} />
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
        <FormField label="Ownership">
          <ToggleButtonGroup
            value={formData.ownership}
            onValueChange={(value) =>
              setFormData({ ...formData, ownership: value as 'individual' | 'joint' })
            }
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'joint', label: 'Joint' },
            ]}
          />
        </FormField>
        <FormField label="Interest type">
          <select
            value={formData.interestType}
            onChange={(e) =>
              setFormData({ ...formData, interestType: e.target.value as 'reducing' | 'flat' })
            }
            className="form-select"
          >
            <option value="reducing">Reducing balance</option>
            <option value="flat">Flat rate</option>
          </select>
        </FormField>
        <FormField label="Start Date">
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </FormField>
      </FormSection>

      {formData.ownership === 'joint' && (
        <FormSection title="Co-borrowers" description="Joint loan holders and share split.">
          {formData.coBorrowers.map((borrower, index) => (
            <div key={index} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Name">
                <Input
                  value={borrower.name}
                  onChange={(e) => {
                    const coBorrowers = [...formData.coBorrowers]
                    coBorrowers[index] = { ...borrower, name: e.target.value }
                    setFormData({ ...formData, coBorrowers })
                  }}
                  placeholder="Co-borrower name"
                />
              </FormField>
              <FormField label="Share %">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={borrower.sharePercent || ''}
                  onChange={(e) => {
                    const coBorrowers = [...formData.coBorrowers]
                    coBorrowers[index] = {
                      ...borrower,
                      sharePercent: parseFloat(e.target.value) || 0,
                    }
                    setFormData({ ...formData, coBorrowers })
                  }}
                />
              </FormField>
            </div>
          ))}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={addCoBorrower}
              className="text-sm text-primary hover:underline"
            >
              + Add co-borrower
            </button>
          </div>
        </FormSection>
      )}

      <FormSection title="Amounts & terms">
        <FormField label="Principal Amount" required>
          <Input
            type="number"
            value={formData.principal || ''}
            onChange={(e) =>
              setFormData({ ...formData, principal: parseFloat(e.target.value) || 0 })
            }
            onBlur={autoFillEmi}
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
            onChange={(e) =>
              setFormData({ ...formData, outstanding: parseFloat(e.target.value) || 0 })
            }
            required
            step="0.01"
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Interest Rate (% p.a.)" required>
          <Input
            type="number"
            value={formData.interestRate || ''}
            onChange={(e) =>
              setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })
            }
            onBlur={autoFillEmi}
            required
            step="0.01"
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Tenure (Months)">
          <Input
            type="number"
            value={formData.tenureMonths || ''}
            onChange={(e) =>
              setFormData({ ...formData, tenureMonths: parseInt(e.target.value, 10) || 0 })
            }
            onBlur={autoFillEmi}
            min="0"
            placeholder="0"
          />
        </FormField>
        <FormField label="Actual EMI" hint="Contractual EMI as per loan agreement">
          <div className="flex gap-2">
            <Input
              type="number"
              value={formData.emi || ''}
              onChange={(e) => setFormData({ ...formData, emi: parseFloat(e.target.value) || 0 })}
              step="0.01"
              min="0"
              placeholder="0"
            />
            <button
              type="button"
              onClick={autoFillEmi}
              className="shrink-0 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-muted"
            >
              Auto
            </button>
          </div>
        </FormField>
        <FormField
          label="EMI currently paying"
          hint="What you pay each month. Amount above interest reduces principal faster."
        >
          <Input
            type="number"
            value={formData.currentEmi || ''}
            onChange={(e) =>
              setFormData({ ...formData, currentEmi: parseFloat(e.target.value) || 0 })
            }
            step="0.01"
            min="0"
            placeholder={formData.emi ? String(formData.emi) : '0'}
          />
        </FormField>
        {formData.currentEmi > formData.emi && formData.emi > 0 && (
          <div className="md:col-span-2 text-sm text-muted-foreground">
            Paying{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(formData.currentEmi - formData.emi)}
            </span>{' '}
            extra per month → faster principal reduction
          </div>
        )}
        <FormField label="Remaining Months">
          <Input
            type="number"
            value={formData.remainingMonths || ''}
            onChange={(e) =>
              setFormData({ ...formData, remainingMonths: parseInt(e.target.value, 10) || 0 })
            }
            min="0"
            placeholder="0"
          />
        </FormField>
        {formData.principal > 0 && formData.tenureMonths > 0 && (
          <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">
              Projected total interest:{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(projected.totalProjectedInterest)}
              </span>
              {' · '}
              Actual EMI:{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(projected.actualEmi)}
              </span>
            </p>
          </div>
        )}
        <FormField label="Notes (Optional)" span="full">
          <Input
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes"
          />
        </FormField>
      </FormSection>

      <FormSection title="Default payment source">
        <FormField label="Payment method">
          <ToggleButtonGroup
            value={formData.isCash ? 'cash' : 'account'}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                isCash: value === 'cash',
                accountId: value === 'cash' ? '' : formData.accountId,
              })
            }
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'account', label: 'Bank account' },
            ]}
          />
        </FormField>
        {!formData.isCash && (
          <FormField label="Linked account">
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
        )}
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
