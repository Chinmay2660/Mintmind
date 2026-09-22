'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField, FormGrid, FormRow, FormSection } from '@/components/ui/form-layout'
import { FinanceStatCard } from '@/components/ui/finance-stat-card'
import { retirementPlanner } from '@/lib/utils/planners'
import { formatCurrency } from '@/lib/utils/format'

export default function RetirementPlannerPage() {
  const [form, setForm] = useState({
    currentAge: '30',
    retirementAge: '60',
    currentInvestments: '500000',
    monthlyInvestment: '15000',
    expectedReturn: '10',
    inflation: '6',
    desiredCorpus: '20000000',
  })

  const results = useMemo(() => {
    return retirementPlanner({
      currentAge: parseFloat(form.currentAge) || 0,
      retirementAge: parseFloat(form.retirementAge) || 0,
      currentInvestments: parseFloat(form.currentInvestments) || 0,
      monthlyInvestment: parseFloat(form.monthlyInvestment) || 0,
      expectedReturn: parseFloat(form.expectedReturn) || 10,
      inflation: parseFloat(form.inflation) || 6,
      desiredCorpus: parseFloat(form.desiredCorpus) || 0,
    })
  }, [form])

  const onTrack = results.gap <= 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retirement Planner"
        subtitle="Project your retirement corpus"
      />

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-sm font-semibold">Your Details</h2>
        <FormGrid>
          <FormSection>
            <FormRow>
              <FormField label="Current age">
                <Input
                  type="number"
                  min="18"
                  value={form.currentAge}
                  onChange={(e) => setForm({ ...form, currentAge: e.target.value })}
                />
              </FormField>
              <FormField label="Retirement age">
                <Input
                  type="number"
                  min="40"
                  value={form.retirementAge}
                  onChange={(e) => setForm({ ...form, retirementAge: e.target.value })}
                />
              </FormField>
            </FormRow>
            <FormField label="Current investments">
              <Input
                type="number"
                min="0"
                value={form.currentInvestments}
                onChange={(e) => setForm({ ...form, currentInvestments: e.target.value })}
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
            <FormRow>
              <FormField label="Expected return (% p.a.)">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.expectedReturn}
                  onChange={(e) => setForm({ ...form, expectedReturn: e.target.value })}
                />
              </FormField>
              <FormField label="Inflation (% p.a.)">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.inflation}
                  onChange={(e) => setForm({ ...form, inflation: e.target.value })}
                />
              </FormField>
            </FormRow>
            <FormField label="Desired corpus (today's value)" span="full">
              <Input
                type="number"
                min="0"
                value={form.desiredCorpus}
                onChange={(e) => setForm({ ...form, desiredCorpus: e.target.value })}
              />
            </FormField>
          </FormSection>
        </FormGrid>
      </Card>

      <p className="text-xs text-muted-foreground">
        All results below are projections based on your inputs and are not guaranteed.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceStatCard
          title="Projected Corpus"
          value={results.projected}
          subtitle={`in ${results.years} years`}
          variant="primary"
        />
        <FinanceStatCard
          title="Inflation-Adjusted Need"
          value={results.inflatedCorpus}
          subtitle="projection"
        />
        <FinanceStatCard
          title="Gap"
          value={Math.abs(results.gap)}
          subtitle={onTrack ? 'surplus projected' : 'shortfall projected'}
          variant={onTrack ? 'success' : 'warning'}
        />
        <FinanceStatCard
          title="Extra Monthly Needed"
          value={results.requiredMonthly}
          subtitle="projection"
          variant={results.requiredMonthly > 0 ? 'warning' : 'success'}
        />
      </div>

      <Card className="p-5 md:p-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Projection:</span> Continuing at your current pace,
          you could accumulate {formatCurrency(results.projected)} by retirement.
          Adjusted for {form.inflation}% inflation, you may need {formatCurrency(results.inflatedCorpus)}.
          {results.gap > 0
            ? ` Consider increasing monthly savings by ${formatCurrency(results.requiredMonthly)}.`
            : ' You appear on track based on these assumptions.'}
        </p>
      </Card>
    </div>
  )
}
