'use client'

import React, { Suspense, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterButtonGroup } from '@/components/ui/filter-button'
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
import { DocumentForm } from './_components/DocumentForm'

const CATEGORY_LABELS: Record<string, string> = {
  insurance: 'Insurance',
  tax: 'Tax',
  investment: 'Investment',
  loan: 'Loan',
  receipt: 'Receipt',
  identity: 'Identity',
  other: 'Other',
}

const DocumentsPageContent = () => {
  const { data: allDocuments, loading, reload } = useApiList('/api/documents')
  const [filterCategory, setFilterCategory] = useState('all')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, entityId, openSheet, closeSheet } = useFormSheet()

  const documents =
    filterCategory === 'all'
      ? allDocuments
      : allDocuments.filter((d) => d.category === filterCategory)

  useRegisterRefresh(reload)
  useAddActionRedirect(openSheet)
  useEditActionRedirect(openSheet)

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Document',
      description: 'Are you sure you want to delete this document?',
      onConfirm: async () => {
        await request.delete(`/api/documents/${id}`)
        toast.success('Document deleted')
        await reload()
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" subtitle="Upload Aadhar, PAN, policies, and other important files">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>
            Add Document
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openSheet} label="Add document" />

      <FilterButtonGroup
        value={filterCategory}
        onValueChange={setFilterCategory}
        options={[
          { value: 'all', label: 'All' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'tax', label: 'Tax' },
          { value: 'investment', label: 'Investment' },
          { value: 'loan', label: 'Loan' },
          { value: 'receipt', label: 'Receipt' },
          { value: 'identity', label: 'Identity' },
          { value: 'other', label: 'Other' },
        ]}
        className="flex-wrap"
      />

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload identity documents and policies with file attachments"
            actionLabel="Add Your First Document"
            onAction={openSheet}
          />
        ) : (
          documents.map((doc) => (
            <Card key={doc._id} delay={0.1} hover className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{doc.name}</h3>
                    <Badge variant="outline">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </Badge>
                  </div>
                  {doc.fileName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">{doc.fileName}</span>
                      {doc.storageKey && (
                        <a
                          href={`/api/documents/file/${doc.storageKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
                        >
                          <Download className="h-3.5 w-3.5" />
                          View
                        </a>
                      )}
                    </div>
                  )}
                  {doc.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doc.notes}</p>
                  )}
                </div>
                <RowActions>
                  <EditButton onClick={() => openSheet(doc._id)} />
                  <DeleteButton onClick={() => handleDelete(doc._id)} />
                </RowActions>
              </div>
            </Card>
          ))
        )}
      </div>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title={entityId ? 'Edit Document' : 'Add Document'}
      >
        <DocumentForm
          key={entityId ?? 'new'}
          documentId={entityId}
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

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsPageContent />
    </Suspense>
  )
}
