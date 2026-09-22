'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { FormSheet } from '@/components/ui/form-sheet'
import { DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TabButtonGroup } from '@/components/ui/tab-button'
import { LoanForm } from './LoanForm'
import { LoanPaymentForm } from './LoanPaymentForm'
import { fetchEntityRecord } from '@/lib/api/entityApi'
import { buildLoanSummary } from '@/lib/utils/loans'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useAuth } from '@/lib/hooks/useAuth'
import { useLocalList } from '@/lib/hooks/useLocalData'

const LOAN_TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  personal: 'Personal',
  car: 'Car',
  education: 'Education',
  other: 'Other',
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  emi: 'EMI',
  advance: 'Advance',
  prepayment: 'Prepayment',
  partial: 'Partial',
}

interface LoanDetailProps {
  loanId: string
}

export function LoanDetail({ loanId }: LoanDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loan, setLoan] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [prepaymentOpen, setPrepaymentOpen] = useState(false)
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()

  const { data: payments, reload: reloadPayments } = useLocalList('loanPayments', user?.id, {
    loanId,
  })

  const loadLoan = useCallback(async () => {
    setLoading(true)
    try {
      const record = await fetchEntityRecord('loans', loanId)
      setLoan(record)
    } catch {
      toast.error('Failed to load loan')
      router.push('/dashboard/loans')
    } finally {
      setLoading(false)
    }
  }, [loanId, router])

  useEffect(() => {
    loadLoan()
  }, [loadLoan])

  const summary = useMemo(
    () => (loan ? buildLoanSummary(loan, payments) : null),
    [loan, payments]
  )

  const prepayments = useMemo(
    () => payments.filter((p) => ['prepayment', 'advance'].includes(p.paymentType)),
    [payments]
  )

  const emiPayments = useMemo(
    () => payments.filter((p) => !['prepayment', 'advance'].includes(p.paymentType)),
    [payments]
  )

  const handleDeletePayment = (id: string) => {
    confirmDelete({
      title: 'Delete payment',
      description: 'This will reverse the outstanding balance update.',
      onConfirm: async () => {
        await request.delete(`/api/loan-payments/${id}`)
        toast.success('Payment deleted')
        await Promise.all([reloadPayments(), loadLoan()])
      },
    })
  }

  if (loading || !loan || !summary) {
    return (
      <div className="space-y-4">
        <PageHeader title="Loan" showBack backHref="/dashboard/loans" />
        <div className="surface-card p-6 animate-pulse">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-4 w-full" />
        </div>
      </div>
    )
  }

  const principal = Number(loan.principal) || 0
  const outstanding = Number(loan.outstanding) || 0
  const payingExtra = summary.currentEmi > summary.actualEmi

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(loan.name)}
        subtitle={loan.lender ? String(loan.lender) : 'Loan details'}
        showBack
        backHref="/dashboard/loans"
      >
        <div className="hidden md:flex gap-2">
          <button
            type="button"
            onClick={() => setPrepaymentOpen(true)}
            className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Record prepayment
          </button>
          <button
            type="button"
            onClick={() => setPaymentOpen(true)}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Record EMI
          </button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Badge>{LOAN_TYPE_LABELS[String(loan.type)] || String(loan.type)}</Badge>
        {loan.ownership === 'joint' && <Badge variant="outline">Joint</Badge>}
        <Badge variant="outline">{Number(loan.interestRate)}% p.a.</Badge>
        {payingExtra && <Badge variant="success">Paying extra EMI</Badge>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
          <p className="text-lg font-bold">{formatCurrency(outstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Actual EMI</p>
          <p className="text-lg font-bold">{formatCurrency(summary.actualEmi)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Currently paying</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(summary.currentEmi)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Interest due (mo)</p>
          <p className="text-lg font-bold">{formatCurrency(summary.interestDueNow)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Prepayments</p>
          <p className="text-lg font-bold">{formatCurrency(summary.prepaymentTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Remaining</p>
          <p className="text-lg font-bold">{summary.remainingMonths} mo</p>
        </Card>
      </div>

      {payingExtra && (
        <Card className="p-4 border-success/30 bg-success/5">
          <p className="text-sm text-foreground">
            Paying <strong>{formatCurrency(summary.extraEmiAmount)}</strong> above contractual EMI
            each month →{' '}
            <strong>{formatCurrency(summary.nextExtraPrincipal)}</strong> extra principal per payment
            {summary.monthsSaved > 0 && (
              <> · ~{summary.monthsSaved} months saved vs actual EMI</>
            )}
          </p>
        </Card>
      )}

      <Card className="p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Principal repaid</span>
          <span className="font-medium">{summary.progressPercent.toFixed(0)}%</span>
        </div>
        <ProgressBar value={summary.progressPercent} />
        <p className="text-xs text-muted-foreground">
          {formatCurrency(summary.principalPaid)} of {formatCurrency(principal)} principal repaid
          {' · '}
          Interest paid: {formatCurrency(summary.interestPaid)}
          {' · '}
          Extra principal from over-EMI: {formatCurrency(summary.extraPrincipalTotal)}
        </p>
      </Card>

      <TabButtonGroup
        value={activeTab}
        onValueChange={setActiveTab}
        options={[
          { value: 'overview', label: 'EMI payments' },
          { value: 'prepayments', label: 'Prepayments' },
          { value: 'schedule', label: 'Schedule' },
          { value: 'edit', label: 'Edit' },
        ]}
      />

      {activeTab === 'overview' && (
        <div className="space-y-3">
          <Card className="p-3 text-sm text-muted-foreground">
            Next EMI of {formatCurrency(summary.currentEmi)}: interest{' '}
            {formatCurrency(summary.interestDueNow)}, principal reduction{' '}
            {formatCurrency(summary.nextPrincipalReduction)}
          </Card>
          {emiPayments.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              No EMI payments recorded yet.
            </Card>
          ) : (
            emiPayments.map((payment) => (
              <Card key={payment._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                      <Badge variant="outline">
                        {PAYMENT_TYPE_LABELS[payment.paymentType] || payment.paymentType}
                      </Badge>
                      {payment.isCash && <Badge variant="outline">Cash</Badge>}
                      {payment.extraPrincipal > 0 && (
                        <Badge variant="success">
                          +{formatCurrency(payment.extraPrincipal)} extra
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.date)}
                      {' · '}
                      Principal {formatCurrency(payment.principalPaid)}
                      {' · '}
                      Interest {formatCurrency(payment.interestPaid)}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                    )}
                  </div>
                  <DeleteButton onClick={() => handleDeletePayment(payment._id)} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'prepayments' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total prepayments</p>
              <p className="text-xl font-bold">{formatCurrency(summary.prepaymentTotal)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Prepayment count</p>
              <p className="text-xl font-bold">{summary.prepaymentCount}</p>
            </Card>
          </div>
          {prepayments.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              No prepayments yet. Use &quot;Record prepayment&quot; to log lump-sum principal payments.
            </Card>
          ) : (
            prepayments.map((payment) => (
              <Card key={payment._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                      <Badge variant="success">
                        {PAYMENT_TYPE_LABELS[payment.paymentType]}
                      </Badge>
                      {payment.isCash && <Badge variant="outline">Cash</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.date)} · Principal reduced by{' '}
                      {formatCurrency(payment.principalPaid)}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                    )}
                  </div>
                  <DeleteButton onClick={() => handleDeletePayment(payment._id)} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <Card className="overflow-hidden">
          <p className="p-3 text-xs text-muted-foreground border-b border-border">
            Schedule based on actual EMI ({formatCurrency(summary.actualEmi)}). Paying{' '}
            {formatCurrency(summary.currentEmi)} closes the loan faster.
          </p>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Month</th>
                  <th className="text-right p-3 font-medium">EMI</th>
                  <th className="text-right p-3 font-medium">Principal</th>
                  <th className="text-right p-3 font-medium">Interest</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {summary.schedule.slice(0, 120).map((row) => (
                  <tr key={row.month} className="border-t border-border">
                    <td className="p-3">{row.month}</td>
                    <td className="p-3 text-right">{formatCurrency(row.emi)}</td>
                    <td className="p-3 text-right">{formatCurrency(row.principal)}</td>
                    <td className="p-3 text-right">{formatCurrency(row.interest)}</td>
                    <td className="p-3 text-right">{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'edit' && (
        <LoanForm
          loanId={loanId}
          onSuccess={() => {
            loadLoan()
            setActiveTab('overview')
          }}
        />
      )}

      <FormSheet open={paymentOpen} onOpenChange={setPaymentOpen} title="Record EMI payment">
        <LoanPaymentForm
          loanId={loanId}
          outstanding={outstanding}
          interestRate={Number(loan.interestRate) || 0}
          actualEmi={summary.actualEmi}
          currentEmi={summary.currentEmi}
          defaultAmount={summary.currentEmi}
          defaultPaymentType="emi"
          variant="sheet"
          onSuccess={() => {
            setPaymentOpen(false)
            reloadPayments()
            loadLoan()
          }}
          onCancel={() => setPaymentOpen(false)}
        />
      </FormSheet>

      <FormSheet open={prepaymentOpen} onOpenChange={setPrepaymentOpen} title="Record prepayment">
        <LoanPaymentForm
          loanId={loanId}
          outstanding={outstanding}
          interestRate={Number(loan.interestRate) || 0}
          actualEmi={summary.actualEmi}
          currentEmi={summary.currentEmi}
          defaultPaymentType="prepayment"
          variant="sheet"
          onSuccess={() => {
            setPrepaymentOpen(false)
            reloadPayments()
            loadLoan()
            setActiveTab('prepayments')
          }}
          onCancel={() => setPrepaymentOpen(false)}
        />
      </FormSheet>

      <div className="md:hidden fixed bottom-20 right-4 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setPrepaymentOpen(true)}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-lg"
        >
          Prepay
        </button>
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg"
        >
          Record EMI
        </button>
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}
