'use client'

import React, { Suspense, useState } from 'react'
import { Home } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
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
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useLocalList } from '@/lib/hooks/useLocalData'
import { useSyncedRefresh } from '@/lib/hooks/useSyncedRefresh'
import { useAddActionRedirect, useEditActionRedirect } from '@/lib/hooks/useAddActionRedirect'
import { useFormSheet } from '@/lib/hooks/useFormSheet'
import { LoanForm } from './_components/LoanForm'

const LOAN_TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  personal: 'Personal',
  car: 'Car',
  education: 'Education',
  other: 'Other',
}

const LoansPageContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const { data: allLoans, loading, reload } = useLocalList('loans', userId)
  const [filterType, setFilterType] = useState('all')
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { open, setOpen, entityId, openSheet, closeSheet } = useFormSheet()

  const loans =
    filterType === 'all' ? allLoans : allLoans.filter((l) => l.type === filterType)

  useSyncedRefresh(reload)
  useAddActionRedirect(openSheet)
  useEditActionRedirect(openSheet)

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Delete Loan',
      description: 'Are you sure you want to delete this loan?',
      onConfirm: async () => {
        await request.delete(`/api/loans/${id}`)
        toast.success('Loan deleted')
        await reload()
      },
    })
  }

  const totalOutstanding = loans.reduce((sum, l) => sum + (l.outstanding || 0), 0)
  const totalEmi = loans.reduce((sum, l) => sum + (l.emi || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" subtitle="Track EMIs, outstanding balances, and interest rates">
        <div className="hidden md:block">
          <AddButton onClick={openSheet}>Add Loan</AddButton>
        </div>
      </PageHeader>

      <FAB onClick={openSheet} label="Add loan" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Total EMI / Month</p>
          <p className="text-2xl font-bold">{formatCurrency(totalEmi)}</p>
        </div>
      </div>

      <FilterButtonGroup
        value={filterType}
        onValueChange={setFilterType}
        options={[
          { value: 'all', label: 'All' },
          { value: 'home', label: 'Home' },
          { value: 'personal', label: 'Personal' },
          { value: 'car', label: 'Car' },
          { value: 'education', label: 'Education' },
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
        ) : loans.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No loans yet"
            description="Add your first loan to track EMIs and outstanding balance"
            actionLabel="Add Your First Loan"
            onAction={openSheet}
          />
        ) : (
          loans.map((loan) => (
            <Card key={loan._id} delay={0.1} hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/loans/${loan._id}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{loan.name}</h3>
                    <Badge>{LOAN_TYPE_LABELS[loan.type] || loan.type}</Badge>
                    {loan.ownership === 'joint' && <Badge variant="outline">Joint</Badge>}
                  </div>
                  {loan.lender && (
                    <p className="text-sm text-muted-foreground">{loan.lender}</p>
                  )}
                </button>
                <RowActions>
                  <EditButton onClick={() => openSheet(loan._id)} />
                  <DeleteButton onClick={() => handleDelete(loan._id)} />
                </RowActions>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {loan.currentEmi && loan.currentEmi !== loan.emi ? 'Paying' : 'EMI'}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(loan.currentEmi || loan.emi)}
                  </p>
                  {loan.currentEmi && loan.currentEmi !== loan.emi && (
                    <p className="text-xs text-muted-foreground">
                      Actual {formatCurrency(loan.emi)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(loan.outstanding)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Interest Rate</p>
                  <p className="text-lg font-bold text-foreground">{loan.interestRate}%</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <FormSheet open={open} onOpenChange={setOpen} title={entityId ? 'Edit Loan' : 'Add Loan'}>
        <LoanForm
          key={entityId ?? 'new'}
          loanId={entityId}
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

export default function LoansPage() {
  return (
    <Suspense fallback={null}>
      <LoansPageContent />
    </Suspense>
  )
}
