'use client'

import { useMemo, useState } from 'react'
import { Flame } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField, FormGrid, FormSection } from '@/components/ui/form-layout'
import { FinanceStatCard } from '@/components/ui/finance-stat-card'
import { firePlanner } from '@/lib/utils/planners'
import { formatCurrency } from '@/lib/utils/format'

export default function FirePlannerPage() {
  const [form, setForm] = useState({
    annualExpenses: '1200000',
    currentCorpus: '2000000',
    monthlyInvestment: '50000',
    expectedReturn: '10',
  })

  const results = useMemo(() => {
    return firePlanner({
      annualExpenses: parseFloat(form.annualExpenses) || 0,
      currentCorpus: parseFloat(form.currentCorpus) || 0,
      monthlyInvestment: parseFloat(form.monthlyInvestment) || 0,
      expectedReturn: parseFloat(form.expectedReturn) || 10,
    })
  }, [form])

  const yearsDisplay = results.estimatedYears >= 50 ? '50+' : results.estimatedYears.toFixed(1)

  return (
    <div className="space-y-6">
      <PageHeader
        title="FIRE Planner"
        subtitle="Plan your path to financial independence"
      />

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-sm font-semibold">Your Details</h2>
        <FormGrid>
          <FormSection>
            <FormField label="Annual expenses">
              <Input
                type="number"
                min="0"
                value={form.annualExpenses}
                onChange={(e) => setForm({ ...form, annualExpenses: e.target.value })}
              />
            </FormField>
            <FormField label="Current corpus">
              <Input
                type="number"
                min="0"
                value={form.currentCorpus}
                onChange={(e) => setForm({ ...form, currentCorpus: e.target.value })}
              />
            </FormField>
            <FormField label="Monthly investment">
              <Input
                type="number"
                min="0"
                value={form.monthlyInvestment}
                onChange={(e) => setForm({ ...form, monthlyInvestment: e.target.value })}
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

      <p className="text-xs text-muted-foreground">
        Results are projections using the 25× annual expenses rule and are not guaranteed.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceStatCard
          title="FIRE Number"
          value={results.fireNumber}
          subtitle="25× annual expenses"
          icon={Flame}
          variant="primary"
        />
        <FinanceStatCard title="Current Corpus" value={results.currentCorpus} />
        <FinanceStatCard
          title="Gap to FIRE"
          value={results.gap}
          variant={results.gap > 0 ? 'warning' : 'success'}
        />
        <FinanceStatCard
          title="Est. Years to FIRE"
          value={parseFloat(yearsDisplay) || 0}
          subtitle="projection"
          format="number"
          variant="success"
        />
      </div>

      <Card className="p-5 md:p-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Projection:</span> Your FIRE number is{' '}
          {formatCurrency(results.fireNumber)} (25× {formatCurrency(parseFloat(form.annualExpenses) || 0)} annual expenses).
          With {formatCurrency(parseFloat(form.currentCorpus) || 0)} saved and{' '}
          {formatCurrency(parseFloat(form.monthlyInvestment) || 0)} invested monthly at {form.expectedReturn}% return,
          you could reach FIRE in approximately {yearsDisplay} years.
        </p>
      </Card>
    </div>
  )
}
