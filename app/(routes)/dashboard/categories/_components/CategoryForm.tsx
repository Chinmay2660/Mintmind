'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { IconPicker } from '@/components/ui/icon-picker'
import { SubmitButton } from '@/components/ui/form-buttons'
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
    return <div className="w-full animate-pulse h-48 rounded-xl bg-muted/40" />
  }

  return (
    <form onSubmit={handleSubmit} className="form-panel">
      <div>
        <label className="text-sm font-medium mb-1 block">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Icon</label>
        <IconPicker
          value={formData.icon}
          onChange={(icon) => setFormData({ ...formData, icon })}
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Color</label>
        <Input
          type="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="h-12 w-full"
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
            className="h-12"
          />
        </div>
      )}
      <div className="form-field-full">
        <SubmitButton isLoading={saving} className="w-full sm:w-auto min-w-[10rem] h-12">
          {categoryId ? 'Update Category' : 'Add Category'}
        </SubmitButton>
      </div>
    </form>
  )
}
