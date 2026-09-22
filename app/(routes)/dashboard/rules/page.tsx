'use client'

import React, { Suspense } from 'react'
import { Zap } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { RowActions } from '@/components/ui/swipeable-row'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect, useEditActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { RuleForm } from './_components/RuleForm'

const OPERATOR_LABELS: Record<string, string> = {
  contains: 'contains',
  equals: 'equals',
  startsWith: 'starts with',
  greaterThan: 'greater than',
  lessThan: 'less than',
}

const RulesPageContent = () => {
  const { user } = useAuth()
  const userId = user?.id
  const { data: rules, loading, reload } = useLocalList('rules', userId)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, entityId, openSheet, closeSheet } = useFormSheet()

  useSyncedRefresh(reload)
  useAddActionRedirect(openSheet)
  useEditActionRedirect(openSheet)

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Rule',
      description: 'Are you sure you want to delete this rule?',
      onConfirm: async () => {
        await request.delete(`/api/rules/${id}`)
        toast.success('Rule deleted successfully')
        await reload()
      },
    })
  }

  const handleToggleEnabled = async (rule: { _id: string; enabled?: boolean }) => {
    const enabled = rule.enabled !== false
    try {
      await request.put(`/api/rules/${rule._id}`, { enabled: !enabled })
      toast.success(enabled ? 'Rule disabled' : 'Rule enabled')
      await reload()
    } catch {
      toast.error('Failed to update rule')
    }
  }

  const formatCondition = (rule: {
    conditions?: { field?: string; operator?: string; value?: string }
  }) => {
    const { field = 'description', operator = 'contains', value = '' } = rule.conditions ?? {}
    const op = OPERATOR_LABELS[operator] ?? operator
    return `When ${field} ${op} "${value}"`
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Rules" subtitle="Auto-categorize transactions with smart rules">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>Add Rule</AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openSheet} label="Add rule" />

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-48" />
            </div>
          ))
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No rules yet"
            description="Create rules to automatically categorize and tag transactions"
            actionLabel="Create Your First Rule"
            onAction={openSheet}
          />
        ) : (
          rules.map((rule, index) => {
            const enabled = rule.enabled !== false
            const categoryName =
              typeof rule.actions?.categoryId === 'object'
                ? rule.actions.categoryId?.name
                : null

            return (
              <Card key={rule._id} delay={0.1 + index * 0.05} hover className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground">{rule.name}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
                        Priority {rule.priority ?? 0}
                      </span>
                      {!enabled && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{formatCondition(rule)}</p>
                    {categoryName && (
                      <p className="text-xs text-muted-foreground">→ {categoryName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleToggleEnabled(rule)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        aria-label={`Toggle ${rule.name}`}
                      />
                      <span className="hidden sm:inline">Enabled</span>
                    </label>
                    <RowActions>
                      <EditButton onClick={() => openSheet(rule._id)} />
                      <DeleteButton onClick={() => handleDelete(rule._id)} />
                    </RowActions>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <FormSheet open={open} onOpenChange={setOpen} title={entityId ? 'Edit Rule' : 'Add Rule'}>
        <RuleForm
          key={entityId ?? 'new'}
          ruleId={entityId}
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

export default function RulesPage() {
  return (
    <Suspense fallback={null}>
      <RulesPageContent />
    </Suspense>
  )
}
