'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Target, Calendar, PiggyBank } from 'lucide-react'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { FormActions, FormField, FormLayout, FormSection } from '@/components/ui/form-layout'
import { FinanceStatCard } from '@/components/ui/finance-stat-card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { formatCurrency } from '@/lib/utils/format'

interface EmergencyFundData {
  currentAmount: number
  targetAmount: number
  monthlyContribution: number
  monthlyExpenses: number
  monthsCovered: number
  progress: number
}

export default function EmergencyFundPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<EmergencyFundData>({
    currentAmount: 0,
    targetAmount: 0,
    monthlyContribution: 0,
    monthlyExpenses: 0,
    monthsCovered: 0,
    progress: 0,
  })
  const [form, setForm] = useState({
    currentAmount: '',
    targetAmount: '',
    monthlyContribution: '',
    monthlyExpenses: '',
  })

  const load = useCallback(async () => {
    const res = await request.get('/api/emergency-fund')
    const data = res.data as EmergencyFundData
    setStats(data)
    setForm({
      currentAmount: String(data.currentAmount ?? 0),
      targetAmount: String(data.targetAmount ?? 0),
      monthlyContribution: String(data.monthlyContribution ?? 0),
      monthlyExpenses: String(data.monthlyExpenses ?? 0),
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    load()
      .catch(() => toast.error('Failed to load emergency fund'))
      .finally(() => setLoading(false))
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        currentAmount: parseFloat(form.currentAmount) || 0,
        targetAmount: parseFloat(form.targetAmount) || 0,
        monthlyContribution: parseFloat(form.monthlyContribution) || 0,
        monthlyExpenses: parseFloat(form.monthlyExpenses) || 0,
      }
      const res = await request.put('/api/emergency-fund', payload)
      const data = res.data as EmergencyFundData
      setStats(data)
      toast.success('Emergency fund updated')
    } catch {
      toast.error('Failed to update emergency fund')
    } finally {
      setSaving(false)
    }
  }

  const progressVariant =
    stats.progress >= 100 ? 'success' : stats.progress >= 50 ? 'warning' : 'default'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Fund"
        subtitle="Build a safety net for unexpected expenses"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceStatCard
          title="Current Amount"
          value={stats.currentAmount}
          icon={ShieldCheck}
          variant="primary"
          loading={loading}
        />
        <FinanceStatCard
          title="Target Amount"
          value={stats.targetAmount}
          icon={Target}
          loading={loading}
        />
        <FinanceStatCard
          title="Months Covered"
          value={stats.monthsCovered}
          subtitle="of expenses"
          icon={Calendar}
          format="number"
          loading={loading}
        />
        <FinanceStatCard
          title="Progress"
          value={stats.progress}
          subtitle="of target"
          icon={PiggyBank}
          format="percent"
          variant={progressVariant}
          loading={loading}
        />
      </div>

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-sm font-semibold">Fund Progress</h2>
        <ProgressBar
          value={stats.currentAmount}
          max={stats.targetAmount || 1}
          showLabel
          label={`${formatCurrency(stats.currentAmount)} of ${formatCurrency(stats.targetAmount)}`}
          variant={progressVariant}
        />
        {stats.monthlyExpenses > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Covers {stats.monthsCovered.toFixed(1)} months of monthly expenses (
            {formatCurrency(stats.monthlyExpenses)})
          </p>
        )}
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-sm font-semibold">Update Fund</h2>
        <FormLayout onSubmit={handleSubmit} variant="embedded">
          <FormSection>
            <FormField label="Current amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              />
            </FormField>
            <FormField label="Target amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </FormField>
            <FormField label="Monthly contribution">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyContribution}
                onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })}
              />
            </FormField>
            <FormField label="Monthly expenses">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyExpenses}
                onChange={(e) => setForm({ ...form, monthlyExpenses: e.target.value })}
              />
            </FormField>
          </FormSection>
          <FormActions>
            <SubmitButton isLoading={saving}>Save changes</SubmitButton>
          </FormActions>
        </FormLayout>
      </Card>
    </div>
  )
}
