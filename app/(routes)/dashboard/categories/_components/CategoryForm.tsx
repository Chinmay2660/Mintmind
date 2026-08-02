'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { IconPicker } from '@/components/ui/icon-picker'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { useAuth } from '@/lib/hooks/useAuth'

const defaultFormData = (type = 'expense') => ({
  name: '',
  type,
  icon: '📁',
  color: '#4845d2',
  budget: 0,
})

interface CategoryFormProps {
  categoryId?: string
}

export function CategoryForm({ categoryId }: CategoryFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(!!categoryId)
  const [saving, setSaving] = useState(false)
  const initialType = searchParams.get('type') === 'income' ? 'income' : 'expense'
  const [formData, setFormData] = useState(defaultFormData(initialType))

  useEffect(() => {
    if (!categoryId || !user) return
    setLoading(true)
    request
      .get(`/api/categories/${categoryId}`)
      .then((res) => {
        const cat = res.data
        setFormData({
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          budget: cat.budget || 0,
        })
      })
      .catch(() => {
        toast.error('Failed to load category')
        router.push('/dashboard/categories')
      })
      .finally(() => setLoading(false))
  }, [categoryId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (categoryId) {
        await request.put(`/api/categories/${categoryId}`, formData)
        toast.success('Category updated successfully')
      } else {
        await request.post('/api/categories', formData)
        toast.success('Category added successfully')
      }
      router.push('/dashboard/categories')
    } catch {
      toast.error('Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="surface-card p-6 animate-pulse h-48" />
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-4 md:p-6 space-y-4 max-w-2xl">
      <div>
        <label className="text-sm font-medium mb-1 block">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Category Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Groceries, Salary"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Icon</label>
        <IconPicker
          value={formData.icon}
          onChange={(icon) => setFormData({ ...formData, icon })}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Color</label>
        <Input
          type="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
        />
      </div>
      {formData.type === 'expense' && (
        <div>
          <label className="text-sm font-medium mb-1 block">Budget (Optional)</label>
          <Input
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
            step="0.01"
            min="0"
            placeholder="Monthly budget"
          />
        </div>
      )}
      <FormButtonGroup
        submitLabel={categoryId ? 'Update Category' : 'Add Category'}
        onCancel={() => router.push('/dashboard/categories')}
        isLoading={saving}
      />
    </form>
  )
}
