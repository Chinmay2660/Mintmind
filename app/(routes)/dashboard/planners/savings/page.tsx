'use client'

import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField, FormGrid, FormSection } from '@/components/ui/form-layout'
import { FinanceStatCard } from '@/components/ui/finance-stat-card'
import { requiredMonthlySaving, projectedValue } from '@/lib/utils/planners'
import { formatCurrency } from '@/lib/utils/format'

function monthsUntil(date: string) {
  if (!date) return 12
  const d = new Date(date)
  const now = new Date()
  return Math.max(1, (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()))
}

export default function SavingsPlannerPage() {
  const [form, setForm] = useState({
    targetAmount: '500000',
    currentAmount: '50000',
    targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2))
      .toISOString()
      .split('T')[0],
    expectedReturn: '8',
  })

  const results = useMemo(() => {
    const targetAmount = parseFloat(form.targetAmount) || 0
    const currentAmount = parseFloat(form.currentAmount) || 0
    const expectedReturn = parseFloat(form.expectedReturn) || 8
    const months = monthsUntil(form.targetDate)

    const monthly = requiredMonthlySaving({
      targetAmount,
      currentAmount,
      targetDate: form.targetDate,
      expectedReturn,
    })
    const projected = projectedValue({
      currentAmount,
      monthlyContribution: monthly,
      months,
      expectedReturn,
    })
    const shortfall = Math.max(0, targetAmount - projected)

    return { monthly, projected, shortfall, months }
  }, [form])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings Planner"
        subtitle="Calculate how much to save each month"
      />

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-sm font-semibold">Goal Details</h2>
        <FormGrid>
          <FormSection>
            <FormField label="Target amount">
              <Input
                type="number"
                min="0"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </FormField>
            <FormField label="Current amount">
              <Input
                type="number"
                min="0"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              />
            </FormField>
            <FormField label="Target date">
              <Input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </FormField>
            <FormField label="Expected return (% p.a.)">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.expectedReturn}
                onChange={(e) => setForm({ ...form, expectedReturn: e.target.value })}
              />
            </FormField>
          </FormSection>
        </FormGrid>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FinanceStatCard
          title="Required Monthly"
          value={results.monthly}
          subtitle={`over ${results.months} months`}
          icon={Calculator}
          variant="primary"
        />
        <FinanceStatCard
          title="Projected Value"
          value={results.projected}
          subtitle="at target date"
          variant="success"
        />
        <FinanceStatCard
          title="Shortfall"
          value={results.shortfall}
          subtitle={results.shortfall > 0 ? 'gap to target' : 'on track'}
          variant={results.shortfall > 0 ? 'warning' : 'success'}
        />
      </div>

      <Card className="p-5 md:p-6">
        <p className="text-sm text-muted-foreground">
          Save <span className="font-semibold text-foreground">{formatCurrency(results.monthly)}</span>{' '}
          per month to reach <span className="font-semibold text-foreground">{formatCurrency(parseFloat(form.targetAmount) || 0)}</span>{' '}
          by your target date. At {form.expectedReturn}% expected return, your projected balance will be{' '}
          <span className="font-semibold text-foreground">{formatCurrency(results.projected)}</span>.
          {results.shortfall > 0 && (
            <> You may fall short by {formatCurrency(results.shortfall)}.</>
          )}
        </p>
      </Card>
    </div>
  )
}
