'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { useAuth } from '@/lib/hooks/useAuth'

const calculateEndDate = (startDate: string, period: string) => {
  if (!startDate) return ''
  const date = new Date(startDate)
  switch (period) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'half-yearly':
      date.setMonth(date.getMonth() + 6)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  return date.toISOString().split('T')[0]
}

const defaultFormData = () => ({
  categoryId: '',
  name: '',
  amount: '',
  period: 'monthly',
  startDate: '',
  endDate: '',
  description: '',
})

interface BudgetFormProps {
  budgetId?: string
}

export function BudgetForm({ budgetId }: BudgetFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [categories, setCategories] = useState<{ _id: string; icon?: string; name: string }[]>([])
  const [loading, setLoading] = useState(!!budgetId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!user) return
    request.get('/api/categories?type=expense').then((res) => setCategories(res.data)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!budgetId || !user) return
    setLoading(true)
    request
      .get(`/api/budgets/${budgetId}`)
      .then((res) => {
        const budget = res.data
        setFormData({
          categoryId: budget.categoryId._id,
          name: budget.name,
          amount: budget.amount,
          period: budget.period,
          startDate: new Date(budget.startDate).toISOString().split('T')[0],
          endDate: new Date(budget.endDate).toISOString().split('T')[0],
          description: budget.description || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load budget')
        router.push('/dashboard/budgets')
      })
      .finally(() => setLoading(false))
  }, [budgetId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (budgetId) {
        await request.put(`/api/budgets/${budgetId}`, formData)
        toast.success('Budget updated successfully')
      } else {
        await request.post('/api/budgets', formData)
        toast.success('Budget created successfully')
      }
      router.push('/dashboard/budgets')
    } catch {
      toast.error('Failed to save budget')
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
        <label className="text-sm font-medium mb-2 block text-foreground">Budget Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Car Maintenance"
          className="h-12"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Category</label>
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Amount</label>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="200000"
          className="h-12"
          required
          min="0"
          step="0.01"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Period</label>
        <select
          value={formData.period}
          onChange={(e) => {
            const newPeriod = e.target.value
            setFormData({
              ...formData,
              period: newPeriod,
              endDate: formData.startDate ? calculateEndDate(formData.startDate, newPeriod) : '',
            })
          }}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly (3 Months)</option>
          <option value="half-yearly">Half-Yearly (6 Months)</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">Start Date</label>
        <Input
          type="date"
          value={formData.startDate}
          onChange={(e) => {
            const newStartDate = e.target.value
            setFormData({
              ...formData,
              startDate: newStartDate,
              endDate: calculateEndDate(newStartDate, formData.period),
            })
          }}
          className="h-12"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block text-foreground">End Date</label>
        <Input
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          className="h-12"
          required
        />
      </div>
      <div className="form-field-full">
        <label className="text-sm font-medium mb-2 block text-foreground">Description (Optional)</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional notes..."
          className="h-12"
        />
      </div>
      <div className="form-field-full">
        <SubmitButton isLoading={saving} className="w-full sm:w-auto min-w-[10rem] h-12">
          {budgetId ? 'Update Budget' : 'Create Budget'}
        </SubmitButton>
      </div>
    </form>
  )
}
