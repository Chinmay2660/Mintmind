'use client'

import React, { Suspense } from 'react'
import { Bell } from 'lucide-react'
import { format, isPast, isToday, startOfDay } from 'date-fns'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
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
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { ReminderForm } from './_components/ReminderForm'

const TYPE_LABELS: Record<string, string> = {
  emi: 'EMI',
  credit_card: 'Credit Card',
  insurance: 'Insurance',
  investment: 'Investment',
  sip: 'SIP',
  bill: 'Bill',
  subscription: 'Subscription',
  policy: 'Policy',
  loan: 'Loan',
  other: 'Other',
}

function getDueGroup(dueDate: string | Date, status?: string) {
  if (status === 'completed') return 'completed'
  const date = startOfDay(new Date(dueDate))
  if (isToday(date)) return 'today'
  if (isPast(date)) return 'overdue'
  return 'upcoming'
}

function ReminderCard({
  reminder,
  onEdit,
  onDelete,
}: {
  reminder: any
  onEdit: () => void
  onDelete: () => void
}) {
  const group = getDueGroup(reminder.dueDate, reminder.status)
  const badgeVariant =
    group === 'overdue' ? 'danger' : group === 'today' ? 'warning' : group === 'completed' ? 'success' : 'default'

  return (
    <Card delay={0.1} hover className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{reminder.title}</h3>
            <Badge variant={badgeVariant}>
              {group === 'completed' ? 'Completed' : group.charAt(0).toUpperCase() + group.slice(1)}
            </Badge>
            <Badge variant="outline">{TYPE_LABELS[reminder.type] || reminder.type}</Badge>
          </div>
        </div>
        <RowActions>
          <EditButton onClick={onEdit} />
          <DeleteButton onClick={onDelete} />
        </RowActions>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Due Date</p>
          <p className="text-sm font-medium text-foreground">
            {format(new Date(reminder.dueDate), 'MMM dd, yyyy')}
          </p>
        </div>
        {reminder.amount > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Amount</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(reminder.amount)}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

function ReminderSection({
  title,
  reminders,
  onEdit,
  onDelete,
}: {
  title: string
  reminders: any[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (reminders.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-3">
        {reminders.map((reminder) => (
          <ReminderCard
            key={reminder._id}
            reminder={reminder}
            onEdit={() => onEdit(reminder._id)}
            onDelete={() => onDelete(reminder._id)}
          />
        ))}
      </div>
    </div>
  )
}

const RemindersPageContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const { data: allReminders, loading, reload } = useLocalList('reminders', userId)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, openSheet, closeSheet } = useFormSheet()

  useSyncedRefresh(reload)
  useAddActionRedirect(openSheet)

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Reminder',
      description: 'Are you sure you want to delete this reminder?',
      onConfirm: async () => {
        await request.delete(`/api/reminders/${id}`)
        toast.success('Reminder deleted')
        await reload()
      },
    })
  }

  const activeReminders = allReminders.filter((r) => r.status !== 'completed')
  const completedReminders = allReminders.filter((r) => r.status === 'completed')

  const overdue = activeReminders.filter((r) => getDueGroup(r.dueDate, r.status) === 'overdue')
  const today = activeReminders.filter((r) => getDueGroup(r.dueDate, r.status) === 'today')
  const upcoming = activeReminders.filter((r) => getDueGroup(r.dueDate, r.status) === 'upcoming')

  const isEmpty = !loading && allReminders.length === 0

  return (
    <div className="space-y-6">
      <PageHeader title="Reminders" subtitle="Stay on top of bills, EMIs, and due dates">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>
            Add Reminder
          </AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openSheet} label="Add reminder" />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Bell}
          title="No reminders yet"
          description="Add reminders for bills, EMIs, and other due dates"
          actionLabel="Add Your First Reminder"
          onAction={openSheet}
        />
      ) : (
        <div className="space-y-8">
          <ReminderSection
            title="Overdue"
            reminders={overdue}
            onEdit={(id) => router.push(`/dashboard/reminders/${id}`)}
            onDelete={handleDelete}
          />
          <ReminderSection
            title="Today"
            reminders={today}
            onEdit={(id) => router.push(`/dashboard/reminders/${id}`)}
            onDelete={handleDelete}
          />
          <ReminderSection
            title="Upcoming"
            reminders={upcoming}
            onEdit={(id) => router.push(`/dashboard/reminders/${id}`)}
            onDelete={handleDelete}
          />
          <ReminderSection
            title="Completed"
            reminders={completedReminders}
            onEdit={(id) => router.push(`/dashboard/reminders/${id}`)}
            onDelete={handleDelete}
          />
        </div>
      )}

      <FormSheet open={open} onOpenChange={setOpen} title="Add Reminder">
        <ReminderForm
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

export default function RemindersPage() {
  return (
    <Suspense fallback={null}>
      <RemindersPageContent />
    </Suspense>
  )
}
