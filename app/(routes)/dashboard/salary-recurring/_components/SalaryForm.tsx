'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCategories, useBankAccounts } from '@/lib/hooks/useReferenceData'
import { getLocal } from '@/lib/offline/repository'

const defaultFormData = () => ({
  amount: '',
  currency: 'INR',
  frequency: 'monthly',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  description: '',
  accountId: '',
  categoryId: '',
})

interface SalaryFormProps {
  salaryId?: string
}

export function SalaryForm({ salaryId }: SalaryFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { accounts } = useBankAccounts(user?.id)
  const [loading, setLoading] = useState(!!salaryId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  const incomeCategories = categories.filter((cat) => cat.type === 'income')

  useEffect(() => {
    if (!salaryId || !user) return
    setLoading(true)
    getLocal('salary', salaryId)
      .then((salary) => {
        if (!salary) throw new Error('Not found')
        setFormData({
          amount: salary.amount,
          currency: salary.currency || 'INR',
          frequency: salary.frequency,
          startDate: format(new Date(salary.startDate), 'yyyy-MM-dd'),
          endDate: salary.endDate ? format(new Date(salary.endDate), 'yyyy-MM-dd') : '',
          description: salary.description || '',
          accountId: salary.accountId?._id || '',
          categoryId: salary.categoryId?._id || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load salary')
        router.push('/dashboard/salary-recurring')
      })
      .finally(() => setLoading(false))
  }, [salaryId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (salaryId) {
        await request.put(`/api/salary/${salaryId}`, formData)
        toast.success('Salary updated successfully')
      } else {
        await request.post('/api/salary', formData)
        toast.success('Salary added successfully')
      }
      router.push('/dashboard/salary-recurring')
    } catch {
      toast.error('Failed to save salary')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="w-full animate-pulse h-64 rounded-xl bg-muted/40" />
  }

  return (
    <form onSubmit={handleSubmit} className="form-panel">
      <div>
        <label className="text-sm font-medium mb-1 block">Amount</label>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0"
          required
          step="0.01"
          min="0"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Frequency</label>
        <select
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="monthly">Monthly</option>
          <option value="bi-weekly">Bi-weekly</option>
          <option value="weekly">Weekly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Start Date</label>
        <Input
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">End Date (Optional)</label>
        <Input
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Category (Optional)</label>
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select category</option>
          {incomeCategories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Account (Optional)</label>
        <select
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select account</option>
          {accounts.map((acc) => (
            <option key={acc._id} value={acc._id}>
              {acc.icon} {acc.accountName}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field-full">
        <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Software Engineer Salary"
          className="h-12"
        />
      </div>
      <div className="form-field-full">
        <SubmitButton isLoading={saving} className="w-full sm:w-auto min-w-[10rem] h-12">
          {salaryId ? 'Update Salary' : 'Add Salary'}
        </SubmitButton>
      </div>
    </form>
  )
}
