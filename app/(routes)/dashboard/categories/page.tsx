'use client'
import React, { useEffect, useState } from 'react'
import { Edit, Trash2, ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { motion } from 'framer-motion'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { FilterButtonGroup } from '@/components/ui/filter-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'

const CategoriesPage = () => {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    icon: '📁',
    color: '#4845d2',
    budget: 0,
  })

  useEffect(() => {
    if (user) {
      fetchCategories()
    }
  }, [user, filterType])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const params = filterType !== 'all' ? { type: filterType } : {}
      const response = await request.get('/api/categories', { params })
      setCategories(response.data)
    } catch (error) {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await request.put(`/api/categories/${editingCategory._id}`, formData)
        toast.success('Category updated successfully')
      } else {
        await request.post('/api/categories', formData)
        toast.success('Category added successfully')
      }
      setIsDialogOpen(false)
      setEditingCategory(null)
      resetForm()
      fetchCategories()
    } catch (error) {
      toast.error('Failed to save category')
    }
  }

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Category',
      description: 'Are you sure you want to delete this category?',
      onConfirm: async () => {
        await request.delete(`/api/categories/${id}`)
        toast.success('Category deleted successfully')
        fetchCategories()
      },
    })
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      budget: category.budget || 0,
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      icon: '📁',
      color: '#4845d2',
      budget: 0,
    })
  }

  const expenseCategories = categories.filter((cat) => cat.type === 'expense')
  const incomeCategories = categories.filter((cat) => cat.type === 'income')

  const openAddForm = (type = 'expense') => {
    resetForm()
    setFormData((prev) => ({ ...prev, type }))
    setEditingCategory(null)
    setIsDialogOpen(true)
  }

  const categoryForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Input
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="📁"
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
        submitLabel={editingCategory ? 'Update Category' : 'Add Category'}
        onCancel={() => setIsDialogOpen(false)}
      />
    </form>
  )

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Manage your expense and income categories"
        showBack
      >
        <div className="hidden md:block">
          <AddButton onClick={() => openAddForm()}>Add Category</AddButton>
        </div>
      </PageHeader>

      <FormSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
      >
        {categoryForm}
      </FormSheet>

      <FAB onClick={() => openAddForm()} label="Add category" />

      {/* Filter */}
      <FilterButtonGroup
        value={filterType}
        onValueChange={setFilterType}
        options={[
          { value: 'all', label: 'All' },
          { value: 'expense', label: 'Expenses', icon: ArrowDownCircle },
          { value: 'income', label: 'Income', icon: ArrowUpCircle },
        ]}
      />

      {/* Categories List */}
      <div className="space-y-6">
        {filterType === 'all' || filterType === 'expense' ? (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-red-500" />
              Expense Categories
            </h2>
            {loading ? (
              // Show skeletons while loading
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="surface-card rounded-xl p-4 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : expenseCategories.length === 0 ? (
              <EmptyState
                icon={ArrowDownCircle}
                title="No expense categories yet"
                description="Add your first expense category to get started"
                actionLabel="Add Expense Category"
                onAction={() => openAddForm('expense')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenseCategories.map((category, index) => (
                  <SwipeableRow
                    key={category._id}
                    onEdit={() => handleEdit(category)}
                    onDelete={() => handleDelete(category._id)}
                  >
                    <Card
                      delay={0.1 + index * 0.05}
                      hover={true}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg text-xl"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            {category.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{category.name}</h3>
                            {category.budget > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Budget: {formatCurrency(category.budget)}
                              </p>
                            )}
                          </div>
                        </div>
                        <DesktopRowActions>
                          <EditButton onClick={() => handleEdit(category)} />
                          <DeleteButton onClick={() => handleDelete(category._id)} />
                        </DesktopRowActions>
                      </div>
                    </Card>
                  </SwipeableRow>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {filterType === 'all' || filterType === 'income' ? (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-green-500" />
              Income Categories
            </h2>
            {loading ? (
              // Show skeletons while loading
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="surface-card rounded-xl p-4 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : incomeCategories.length === 0 ? (
              <EmptyState
                icon={ArrowUpCircle}
                title="No income categories yet"
                description="Add your first income category to get started"
                actionLabel="Add Income Category"
                onAction={() => openAddForm('income')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {incomeCategories.map((category, index) => (
                  <SwipeableRow
                    key={category._id}
                    onEdit={() => handleEdit(category)}
                    onDelete={() => handleDelete(category._id)}
                  >
                    <Card
                      delay={0.1 + index * 0.05}
                      hover={true}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg text-xl"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            {category.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{category.name}</h3>
                          </div>
                        </div>
                        <DesktopRowActions>
                          <EditButton onClick={() => handleEdit(category)} />
                          <DeleteButton onClick={() => handleDelete(category._id)} />
                        </DesktopRowActions>
                      </div>
                    </Card>
                  </SwipeableRow>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default CategoriesPage

