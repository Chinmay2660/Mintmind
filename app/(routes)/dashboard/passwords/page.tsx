'use client'

import React, { Suspense } from 'react'
import { Lock } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useApiList } from '@/lib/hooks/useApiList'
import { useRegisterRefresh } from '@/contexts/RefreshContext'
import { useAddActionRedirect, useEditActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { PasswordForm } from './_components/PasswordForm'

function PasswordCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: any
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card delay={0.1} hover className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{entry.service}</h3>
            {entry.category && <Badge variant="outline">{entry.category}</Badge>}
          </div>
          {entry.username && (
            <p className="text-sm text-muted-foreground truncate">{entry.username}</p>
          )}
        </div>
        <RowActions>
          <EditButton onClick={onEdit} />
          <DeleteButton onClick={onDelete} />
        </RowActions>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Password</p>
        <p className="text-sm font-mono text-foreground break-all">
          {entry.password || '—'}
        </p>
      </div>
      {entry.url && (
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline mt-3 inline-block truncate max-w-full"
        >
          {entry.url}
        </a>
      )}
    </Card>
  )
}

const PasswordsPageContent = () => {
  const { data: passwords, loading, reload } = useApiList('/api/passwords')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, entityId, openSheet, closeSheet } = useFormSheet()

  useRegisterRefresh(reload)
  useAddActionRedirect(openSheet)
  useEditActionRedirect(openSheet)

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Password Entry',
      description: 'Are you sure you want to delete this password entry?',
      onConfirm: async () => {
        await request.delete(`/api/passwords/${id}`)
        toast.success('Password entry deleted')
        await reload()
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Passwords" subtitle="Store login credentials">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>
            Add Entry
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openSheet} label="Add password" />

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : passwords.length === 0 ? (
          <EmptyState
            icon={Lock}
            title="No password entries yet"
            description="Store your login credentials"
            actionLabel="Add Your First Entry"
            onAction={openSheet}
          />
        ) : (
          passwords.map((entry) => (
            <PasswordCard
              key={entry._id}
              entry={entry}
              onEdit={() => openSheet(entry._id)}
              onDelete={() => handleDelete(entry._id)}
            />
          ))
        )}
      </div>

      <FormSheet open={open} onOpenChange={setOpen} title={entityId ? 'Edit Password Entry' : 'Add Password Entry'}>
        <PasswordForm
          key={entityId ?? 'new'}
          passwordId={entityId}
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

export default function PasswordsPage() {
  return (
    <Suspense fallback={null}>
      <PasswordsPageContent />
    </Suspense>
  )
}
