'use client'
import React, { Suspense, useCallback, useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { FilterButtonGroup } from '@/components/ui/filter-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useCategories } from '@/lib/hooks/useReferenceData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect, useEditActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { CategoryForm } from './_components/CategoryForm'

const CategoriesPageContent = () => {
  const { user } = useAuth()
  const userId = user?.id
  const { categories: allCategories, loading, refetch: reload } = useCategories(userId)
  const [filterType, setFilterType] = useState('all')
  const [addType, setAddType] = useState<'expense' | 'income'>('expense')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, entityId, openSheet, closeSheet } = useFormSheet()

  const openAddSheet = useCallback(
    (type?: 'expense' | 'income') => {
      setAddType(type ?? 'expense')
      openSheet()
    },
    [openSheet]
  )

  useAddActionRedirect(() => openAddSheet())
  useEditActionRedirect(openSheet)

  const categories =
    filterType === 'all'
      ? allCategories
      : allCategories.filter((cat) => cat.type === filterType)

  useSyncedRefresh(reload)

  const handleDelete = (id) => {
    confirmDelete({
      title: 'Delete Category',
      description: 'Are you sure you want to delete this category?',
      onConfirm: async () => {
        await request.delete(`/api/categories/${id}`)
        toast.success('Category deleted successfully')
        await reload()
      },
    })
  }

  const expenseCategories = categories.filter((cat) => cat.type === 'expense')
  const incomeCategories = categories.filter((cat) => cat.type === 'income')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Manage your expense and income categories"
      >
        <div className="hidden md:block">
          <AddButton onClick={() => openAddSheet()}>
            Add Category
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={() => openAddSheet()} label="Add category" />

      <FilterButtonGroup
        value={filterType}
        onValueChange={setFilterType}
        options={[
          { value: 'all', label: 'All' },
          { value: 'expense', label: 'Expenses', icon: ArrowDownCircle },
          { value: 'income', label: 'Income', icon: ArrowUpCircle },
        ]}
      />

      <div className="space-y-6">
        {filterType === 'all' || filterType === 'expense' ? (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-red-500" />
              Expense Categories
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="surface-card p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="skeleton-icon-sm w-12 h-12"></div>
                      <div className="flex-1">
                        <div className="skeleton h-4 w-24 mb-2"></div>
                        <div className="skeleton h-3 w-16"></div>
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
                onAction={() => openAddSheet('expense')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenseCategories.map((category, index) => (
                    <Card key={category._id} delay={0.1 + index * 0.05} hover={true} className="p-4">
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
                        <RowActions>
                          <EditButton
                            onClick={() => openSheet(category._id)}
                          />
                          <DeleteButton onClick={() => handleDelete(category._id)} />
                        </RowActions>
                      </div>
                    </Card>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="surface-card p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="skeleton-icon-sm w-12 h-12"></div>
                      <div className="flex-1">
                        <div className="skeleton h-4 w-24 mb-2"></div>
                        <div className="skeleton h-3 w-16"></div>
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
                onAction={() => openAddSheet('income')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {incomeCategories.map((category, index) => (
                    <Card key={category._id} delay={0.1 + index * 0.05} hover={true} className="p-4">
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
                        <RowActions>
                          <EditButton
                            onClick={() => openSheet(category._id)}
                          />
                          <DeleteButton onClick={() => handleDelete(category._id)} />
                        </RowActions>
                      </div>
                    </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title={entityId ? 'Edit Category' : 'Add Category'}
      >
        <CategoryForm
          key={entityId ?? addType}
          categoryId={entityId}
          variant="sheet"
          defaultType={entityId ? undefined : addType}
          onSuccess={() => {
            closeSheet()
            reload()
          }}
          onCancel={closeSheet}
        />
      </FormSheet>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={null}>
      <CategoriesPageContent />
    </Suspense>
  )
}
