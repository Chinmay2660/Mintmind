'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { ToggleButtonGroup } from '@/components/ui/toggle-button'
import { useAuth } from '@/lib/hooks/useAuth'
import { useOffline } from '@/contexts/OfflineContext'
import { useCategories, useBankAccounts } from '@/lib/hooks/useReferenceData'

interface FormData {
  type: 'expense' | 'income' | 'transfer'
  amount: number
  categoryId: string
  accountId: string
  isCash: boolean
  transferToAccountId: string
  transferToIsCash: boolean
  description: string
  date: string
}

const emptyForm = (type: FormData['type'] = 'expense'): FormData => ({
  type,
  amount: 0,
  categoryId: '',
  accountId: '',
  isCash: false,
  transferToAccountId: '',
  transferToIsCash: false,
  description: '',
  date: new Date().toISOString().split('T')[0],
})

interface TransactionFormProps {
  transactionId?: string
}

export function TransactionForm({ transactionId }: TransactionFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { online } = useOffline()
  const { categories } = useCategories(user?.id)
  const { accounts } = useBankAccounts(user?.id)
  const [loading, setLoading] = useState(!!transactionId)
  const [saving, setSaving] = useState(false)

  const initialType = searchParams.get('type')
  const [formData, setFormData] = useState<FormData>(() =>
    emptyForm(
      initialType === 'income' || initialType === 'expense' || initialType === 'transfer'
        ? initialType
        : 'expense'
    )
  )

  useEffect(() => {
    if (!transactionId || !user) return
    setLoading(true)
    request
      .get(`/api/transactions/${transactionId}`)
      .then((res) => {
        const tx = res.data
        setFormData({
          type: tx.type,
          amount: tx.amount,
          categoryId: tx.categoryId?._id || '',
          accountId: typeof tx.accountId === 'object' ? tx.accountId?._id || '' : '',
          isCash: tx.isCash ?? false,
          transferToAccountId:
            typeof tx.transferToAccountId === 'object' ? tx.transferToAccountId?._id || '' : '',
          transferToIsCash: tx.transferToIsCash ?? false,
          description: tx.description || '',
          date: format(new Date(tx.date), 'yyyy-MM-dd'),
        })
      })
      .catch(() => {
        toast.error('Failed to load transaction')
        router.push('/dashboard/transactions')
      })
      .finally(() => setLoading(false))
  }, [transactionId, user, router])

  const filteredCategories = categories.filter((cat) =>
    formData.type === 'transfer' ? true : cat.type === formData.type
  )

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
      }

      if (transactionId) {
        await request.put(`/api/transactions/${transactionId}`, payload)
        toast.success(online ? 'Transaction updated' : 'Updated offline — will sync when connected')
      } else {
        await request.post('/api/transactions', payload)
        toast.success(online ? 'Transaction added' : 'Saved offline — will sync when connected')
      }
      router.push('/dashboard/transactions')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save transaction'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="max-w-2xl animate-pulse h-64 rounded-xl bg-muted/40" />
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div>
        <label className="text-sm font-medium mb-1 block">Type</label>
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
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Amount</label>
        <Input
          type="number"
          value={formData.amount || ''}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          required
          step="0.01"
          min="0"
        />
      </div>
      {formData.type !== 'transfer' && (
        <div>
          <label className="text-sm font-medium mb-1 block">Category</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select category</option>
            {filteredCategories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-sm font-medium mb-1 block">
          {formData.type === 'transfer' ? 'From' : 'Payment Method'}
        </label>
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
            { value: 'account', label: 'Bank Account' },
          ]}
        />
      </div>
      {!formData.isCash && (
        <div>
          <label className="text-sm font-medium mb-1 block">
            {formData.type === 'transfer' ? 'From Account' : 'Account'}
          </label>
          <select
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required={!formData.isCash}
          >
            <option value="">Select account</option>
            {accounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.icon} {acc.accountName}
              </option>
            ))}
          </select>
        </div>
      )}
      {formData.type === 'transfer' && (
        <>
          <div>
            <label className="text-sm font-medium mb-1 block">To</label>
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
                { value: 'account', label: 'Bank Account' },
              ]}
            />
          </div>
          {!formData.transferToIsCash && (
            <div>
              <label className="text-sm font-medium mb-1 block">To Account</label>
              <select
                value={formData.transferToAccountId}
                onChange={(e) => setFormData({ ...formData, transferToAccountId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required={!formData.transferToIsCash}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.icon} {acc.accountName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Date</label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>
      <SubmitButton isLoading={saving} className="w-full sm:w-auto min-w-[10rem]">
        {transactionId ? 'Update Transaction' : 'Add Transaction'}
      </SubmitButton>
    </form>
  )
}
