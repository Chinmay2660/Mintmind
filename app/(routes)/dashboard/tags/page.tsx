'use client'

import React, { Suspense } from 'react'
import { Hash } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { TagBadge } from '@/components/ui/tag-badge'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { TagForm } from './_components/TagForm'

const TagsPageContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const { data: tags, loading, reload } = useLocalList('tags', userId)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, openSheet, closeSheet } = useFormSheet()

  useSyncedRefresh(reload)
  useAddActionRedirect(openSheet)

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Tag',
      description: 'Are you sure you want to delete this tag?',
      onConfirm: async () => {
        await request.delete(`/api/tags/${id}`)
        toast.success('Tag deleted successfully')
        await reload()
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tags" subtitle="Organize transactions with custom tags">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>Add Tag</AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openSheet} label="Add tag" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-4 animate-pulse">
              <div className="skeleton h-6 w-24" />
            </div>
          ))
        ) : tags.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Hash}
              title="No tags yet"
              description="Create tags to label and filter your transactions"
              actionLabel="Add Your First Tag"
              onAction={openSheet}
            />
          </div>
        ) : (
          tags.map((tag, index) => (
            <Card key={tag._id} delay={0.1 + index * 0.05} hover className="p-4">
              <div className="flex items-center justify-between">
                <TagBadge name={tag.name} color={tag.color} className="text-sm px-3 py-1" />
                <RowActions>
                  <EditButton onClick={() => router.push(`/dashboard/tags/${tag._id}`)} />
                  <DeleteButton onClick={() => handleDelete(tag._id)} />
                </RowActions>
              </div>
            </Card>
          ))
        )}
      </div>

      <FormSheet open={open} onOpenChange={setOpen} title="Add Tag">
        <TagForm
          variant="sheet"
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

export default function TagsPage() {
  return (
    <Suspense fallback={null}>
      <TagsPageContent />
    </Suspense>
  )
}
