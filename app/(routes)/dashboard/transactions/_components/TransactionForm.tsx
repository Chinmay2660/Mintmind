'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { useCategories, useBankAccounts } from '@/lib/hooks/useReferenceData'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import { useLocalList } from '@/lib/hooks/useLocalData'
import type { EntityFormProps } from '@/lib/forms/types'
import { formatCurrency } from '@/lib/utils/format'
import { getBudgetAllocations } from '@/lib/utils/budgetAllocation'

interface FormData {
  type: 'expense' | 'income' | 'transfer'
  amount: number
  categoryId: string
  subcategoryId: string
  tagIds: string[]
  accountId: string
  isCash: boolean
  transferToAccountId: string
  transferToIsCash: boolean
  description: string
  date: string
  isRecurring: boolean
  budgetSplitEnabled: boolean
  budgetSplitMonths: number
  budgetSplitStartMonth: string
}

const emptyForm = (type: FormData['type'] = 'expense'): FormData => ({
  type,
  amount: 0,
  categoryId: '',
  subcategoryId: '',
  tagIds: [],
  accountId: '',
  isCash: false,
  transferToAccountId: '',
  transferToIsCash: false,
  description: '',
  date: new Date().toISOString().split('T')[0],
  isRecurring: false,
  budgetSplitEnabled: false,
  budgetSplitMonths: 2,
  budgetSplitStartMonth: new Date().toISOString().slice(0, 7),
})

interface TransactionFormProps extends EntityFormProps {
  transactionId?: string
  defaultValues?: Partial<FormData>
  skipBalanceUpdate?: boolean
  lockType?: boolean
  lockPaymentMethod?: boolean
}

export function TransactionForm({
  transactionId,
  defaultValues,
  skipBalanceUpdate,
  lockType,
  lockPaymentMethod,
  variant = 'page',
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { accounts } = useBankAccounts(user?.id)
  const { data: tags } = useLocalList('tags', user?.id)
  const [loading, setLoading] = useState(!!transactionId)
  const [saving, setSaving] = useState(false)

  const initialType = searchParams.get('type')
  const [formData, setFormData] = useState<FormData>(() => {
    const base = emptyForm(
      initialType === 'income' || initialType === 'expense' || initialType === 'transfer'
        ? initialType
        : 'expense'
    )
    return defaultValues ? { ...base, ...defaultValues } : base
  })

  useEffect(() => {
    if (!transactionId || !user) return
    setLoading(true)
    fetchEntityRecord('transactions', transactionId)
      .then((tx) => {
        if (!tx) throw new Error('Not found')
        setFormData({
          type: tx.type,
          amount: tx.amount,
          categoryId: tx.categoryId?._id || tx.categoryId || '',
          subcategoryId: tx.subcategoryId?._id || tx.subcategoryId || '',
          tagIds: (tx.tagIds || []).map((t: { _id?: string } | string) => (typeof t === 'object' ? t._id : t) || ''),
          accountId: typeof tx.accountId === 'object' ? tx.accountId?._id || '' : '',
          isCash: tx.isCash ?? false,
          transferToAccountId:
            typeof tx.transferToAccountId === 'object' ? tx.transferToAccountId?._id || '' : '',
          transferToIsCash: tx.transferToIsCash ?? false,
          description: tx.description || '',
          date: format(new Date(tx.date), 'yyyy-MM-dd'),
          isRecurring: tx.isRecurring ?? false,
          budgetSplitEnabled: tx.budgetSplitEnabled ?? false,
          budgetSplitMonths: tx.budgetSplitMonths ?? 2,
          budgetSplitStartMonth: tx.budgetSplitStartMonth
            ? format(new Date(tx.budgetSplitStartMonth), 'yyyy-MM')
            : format(new Date(tx.date), 'yyyy-MM'),
        })
      })
      .catch(() => {
        toast.error('Failed to load transaction')
        router.push('/dashboard/transactions')
      })
      .finally(() => setLoading(false))
  }, [transactionId, user, router])

  const topCategories = categories.filter((cat) =>
    !cat.parentId && (formData.type === 'transfer' ? true : cat.type === formData.type)
  )
  const subcategories = categories.filter((cat) => {
    if (!cat.parentId) return false
    const pid = typeof cat.parentId === 'object' ? cat.parentId._id : cat.parentId
    return pid === formData.categoryId
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.type !== 'transfer' && !formData.categoryId) {
      toast.error('Please select a category')
      return
    }
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    if (formData.type === 'transfer') {
      const hasFrom = formData.isCash || formData.accountId
      const hasTo = formData.transferToIsCash || formData.transferToAccountId
      if (!hasFrom || !hasTo) {
        toast.error('Please select both source and destination')
        return
      }
    } else if (!formData.isCash && !formData.accountId) {
      toast.error('Please select an account')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        accountId: formData.isCash ? null : formData.accountId,
        transferToAccountId: formData.transferToIsCash ? null : formData.transferToAccountId,
        categoryId: formData.type === 'transfer' ? undefined : formData.categoryId,
        budgetSplitEnabled: formData.type === 'expense' && formData.budgetSplitEnabled,
        budgetSplitMonths:
          formData.type === 'expense' && formData.budgetSplitEnabled
            ? formData.budgetSplitMonths
            : undefined,
        budgetSplitStartMonth:
          formData.type === 'expense' && formData.budgetSplitEnabled
            ? `${formData.budgetSplitStartMonth}-01`
            : undefined,
        ...(skipBalanceUpdate && { skipBalanceUpdate: true }),
      }

      if (transactionId) {
        await request.put(`/api/transactions/${transactionId}`, payload)
        toast.success('Transaction updated')
      } else {
        await request.post('/api/transactions', payload)
        toast.success('Transaction added')
      }
      if (onSuccess) onSuccess()
      else router.push('/dashboard/transactions')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save transaction'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormSkeleton />
  }

  return (
    <FormLayout variant={variant} onSubmit={handleSubmit}>
      {!lockType && (
        <FormSection title="Type" description="What kind of transaction is this?">
          <FormField label="Transaction type" span="full">
            <ToggleButtonGroup
              value={formData.type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  type: value as FormData['type'],
                  categoryId: '',
                })
              }
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
                { value: 'transfer', label: 'Transfer' },
              ]}
            />
          </FormField>
        </FormSection>
      )}

      <FormSection
        title="Amount & category"
        description={
          formData.type === 'transfer'
            ? 'How much are you moving?'
            : 'Enter the amount and classify the transaction.'
        }
      >
        <FormField label="Amount" required>
          <Input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            required
            step="0.01"
            min="0"
          />
        </FormField>

        {formData.type !== 'transfer' && (
          <FormField label="Category" required>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}
              className="form-select"
              required
            >
              <option value="">Select category</option>
              {topCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {formData.type !== 'transfer' && subcategories.length > 0 && (
          <FormField label="Subcategory">
            <select
              value={formData.subcategoryId}
              onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
              className="form-select"
            >
              <option value="">None</option>
              {subcategories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </FormField>
        )}

        {formData.type !== 'transfer' && tags.length > 0 && (
          <FormField label="Tags" span="full">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = formData.tagIds.includes(tag._id)
                return (
                  <button
                    key={tag._id}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      tagIds: selected
                        ? formData.tagIds.filter((id) => id !== tag._id)
                        : [...formData.tagIds, tag._id],
                    })}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                  >
                    #{tag.name}
                  </button>
                )
              })}
            </div>
          </FormField>
        )}
      </FormSection>

      <FormSection
        title={formData.type === 'transfer' ? 'Transfer accounts' : 'Payment'}
        description={
          formData.type === 'transfer'
            ? 'Choose where money is coming from and going to.'
            : 'How was this transaction paid?'
        }
      >
        {!lockPaymentMethod && (
          <FormField
            label={formData.type === 'transfer' ? 'From' : 'Payment method'}
            span={formData.isCash ? 'full' : 'default'}
          >
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
        )}

        {!formData.isCash && !lockPaymentMethod && (
          <FormField
            label={formData.type === 'transfer' ? 'From account' : 'Account'}
            required
          >
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="form-select"
              required={!formData.isCash}
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

        {formData.type === 'transfer' && (
          <>
            <FormField
              label="To"
              span={formData.transferToIsCash ? 'full' : 'default'}
            >
              <ToggleButtonGroup
                value={formData.transferToIsCash ? 'cash' : 'account'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    transferToIsCash: value === 'cash',
                    transferToAccountId: value === 'cash' ? '' : formData.transferToAccountId,
                  })
                }
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'account', label: 'Bank account' },
                ]}
              />
            </FormField>

            {!formData.transferToIsCash && (
              <FormField label="To account" required>
                <select
                  value={formData.transferToAccountId}
                  onChange={(e) => setFormData({ ...formData, transferToAccountId: e.target.value })}
                  className="form-select"
                  required={!formData.transferToIsCash}
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
          </>
        )}
      </FormSection>

      {formData.type === 'expense' && (
        <FormSection
          title="Budget split"
          description="Spread this expense across months for budget tracking. Cash is still recorded on the payment date."
        >
          <FormField label="Split for budget" span="full">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={formData.budgetSplitEnabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    budgetSplitEnabled: e.target.checked,
                    budgetSplitStartMonth: formData.budgetSplitStartMonth || formData.date.slice(0, 7),
                  })
                }
                className="rounded border-border"
              />
              Split amount across multiple months for budget
            </label>
          </FormField>
          {formData.budgetSplitEnabled && (
            <>
              <FormField label="Number of months" required>
                <Input
                  type="number"
                  min={2}
                  max={24}
                  value={formData.budgetSplitMonths || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budgetSplitMonths: Math.max(2, parseInt(e.target.value, 10) || 2),
                    })
                  }
                  required
                />
              </FormField>
              <FormField label="First budget month" required>
                <Input
                  type="month"
                  value={formData.budgetSplitStartMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, budgetSplitStartMonth: e.target.value })
                  }
                  required
                />
              </FormField>
              {formData.amount > 0 && (
                <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Budget allocation preview</p>
                  <ul className="space-y-1">
                    {getBudgetAllocations({
                      amount: formData.amount,
                      date: `${formData.budgetSplitStartMonth}-01`,
                      budgetSplitEnabled: true,
                      budgetSplitMonths: formData.budgetSplitMonths,
                      budgetSplitStartMonth: `${formData.budgetSplitStartMonth}-01`,
                    }).map((slice) => (
                      <li key={slice.monthStart.toISOString()}>
                        {format(new Date(slice.monthStart), 'MMM yyyy')}: {formatCurrency(slice.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </FormSection>
      )}

      <FormSection title="Details" description="Optional notes and when this happened.">
        <FormField label="Description" span="full">
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
          />
        </FormField>
        <FormField label="Date" required>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </FormField>
      </FormSection>

      <FormSubmitBar
        variant={variant}
        submitLabel={transactionId ? 'Update transaction' : 'Add transaction'}
        onCancel={onCancel}
        isLoading={saving}
      />
    </FormLayout>
  )
}
