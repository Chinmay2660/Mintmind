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
  FormRow,
  FormSection,
  FormSkeleton,
} from '@/components/ui/form-layout'
import { useAuth } from '@/lib/hooks/useAuth'

const defaultFormData = () => ({
  type: 'FD',
  name: '',
  amount: 0,
  investedDate: new Date().toISOString().split('T')[0],
  maturityDate: '',
  maturityType: 'Ongoing',
  currentValue: '',
  interestRate: '',
  accountId: '',
  notes: '',
  schemeCode: '',
  units: '',
  purchaseNav: '',
  sipAmount: '',
  assetClass: 'other',
})

interface InvestmentFormProps extends EntityFormProps {
  investmentId?: string
}

import { useBankAccounts } from '@/lib/hooks/useReferenceData'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import type { EntityFormProps } from '@/lib/forms/types'

export function InvestmentForm({
  investmentId,
  variant = 'page',
  onSuccess,
  onCancel,
}: InvestmentFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { accounts } = useBankAccounts(user?.id)
  const [loading, setLoading] = useState(!!investmentId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!investmentId || !user) return
    setLoading(true)
    fetchEntityRecord('investments', investmentId)
      .then((inv) => {
        if (!inv) throw new Error('Not found')
        setFormData({
          type: inv.type,
          name: inv.name,
          amount: inv.amount,
          investedDate: format(new Date(inv.investedDate), 'yyyy-MM-dd'),
          maturityDate: inv.maturityDate ? format(new Date(inv.maturityDate), 'yyyy-MM-dd') : '',
          maturityType: inv.maturityType,
          currentValue: inv.currentValue || '',
          interestRate: inv.interestRate || '',
          accountId: inv.accountId?._id || '',
          notes: inv.notes || '',
          schemeCode: inv.schemeCode || '',
          units: inv.units || '',
          purchaseNav: inv.purchaseNav || '',
          sipAmount: inv.sipAmount || '',
          assetClass: inv.assetClass || 'other',
        })
      })
      .catch(() => {
        toast.error('Failed to load investment')
        router.push('/dashboard/investments')
      })
      .finally(() => setLoading(false))
  }, [investmentId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : null,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : null,
        units: formData.units ? parseFloat(formData.units) : null,
        purchaseNav: formData.purchaseNav ? parseFloat(formData.purchaseNav) : null,
        sipAmount: formData.sipAmount ? parseFloat(formData.sipAmount) : null,
        accountId: formData.accountId || null,
        schemeCode: formData.schemeCode || null,
      }
      if (investmentId) {
        await request.put(`/api/investments/${investmentId}`, payload)
        toast.success('Investment updated successfully')
      } else {
        await request.post('/api/investments', payload)
        toast.success('Investment added successfully')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/investments')
    } catch {
      toast.error('Failed to save investment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton variant={variant} />
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      <FormSection title="Investment details">
        <FormField label="Investment Type">
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form-select"
          >
            <option value="FD">Fixed Deposit</option>
            <option value="Mutual Fund">Mutual Fund</option>
            <option value="Stock">Stock</option>
            <option value="Gold">Gold</option>
            <option value="Gold ETF">Gold ETF</option>
            <option value="EPF">EPF</option>
            <option value="EPS">EPS</option>
            <option value="Other">Other</option>
          </select>
        </FormField>
        <FormField label="Name" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., HDFC FD, SBI Mutual Fund"
          />
        </FormField>
        <FormField label="Amount Invested" required>
          <Input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            required
            step="0.01"
            min="0"
          />
        </FormField>
        <FormField label="Invested Date" required>
          <Input
            type="date"
            value={formData.investedDate}
            onChange={(e) => setFormData({ ...formData, investedDate: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Maturity Date (Optional)">
          <Input
            type="date"
            value={formData.maturityDate}
            onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
          />
        </FormField>
        <FormField label="Maturity Type">
          <select
            value={formData.maturityType}
            onChange={(e) => setFormData({ ...formData, maturityType: e.target.value })}
            className="form-select"
          >
            <option value="Ongoing">Ongoing</option>
            <option value="Payout">Payout</option>
            <option value="Reinvestment">Reinvestment</option>
            <option value="Maturity">Maturity</option>
          </select>
        </FormField>
      </FormSection>
      {formData.type === 'Mutual Fund' && (
        <FormSection title="Mutual fund details">
          <FormField label="Scheme Code (mfapi.in)">
            <Input value={formData.schemeCode} onChange={(e) => setFormData({ ...formData, schemeCode: e.target.value })} placeholder="e.g., 120503" />
          </FormField>
          <FormRow>
            <FormField label="Units">
              <Input type="number" value={formData.units} onChange={(e) => setFormData({ ...formData, units: e.target.value })} step="0.0001" />
            </FormField>
            <FormField label="Purchase NAV">
              <Input type="number" value={formData.purchaseNav} onChange={(e) => setFormData({ ...formData, purchaseNav: e.target.value })} step="0.0001" />
            </FormField>
          </FormRow>
          <FormField label="SIP Amount (monthly)">
            <Input type="number" value={formData.sipAmount} onChange={(e) => setFormData({ ...formData, sipAmount: e.target.value })} step="0.01" />
          </FormField>
          <FormField label="Asset Class">
            <select value={formData.assetClass} onChange={(e) => setFormData({ ...formData, assetClass: e.target.value })} className="form-select">
              <option value="equity">Equity</option>
              <option value="debt">Debt</option>
              <option value="gold">Gold</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </FormField>
        </FormSection>
      )}
      <FormSection title="Additional details">
        <FormField label="Current Value (Optional)">
          <Input
            type="number"
            value={formData.currentValue}
            onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
            step="0.01"
            placeholder="Current market value"
          />
        </FormField>
        <FormField label="Interest Rate % (Optional)">
          <Input
            type="number"
            value={formData.interestRate}
            onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
            step="0.01"
            placeholder="Annual interest rate"
          />
        </FormField>
        <FormField label="Source Account (Optional)">
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
        submitLabel={investmentId ? 'Update Investment' : 'Add Investment'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
