'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { FormActions, FormField, FormLayout, FormSection } from '@/components/ui/form-layout'
import { AllocationBar } from '@/components/ui/allocation-bar'
import { FinanceStatCard } from '@/components/ui/finance-stat-card'
import { formatCurrency } from '@/lib/utils/format'

const ASSET_CLASSES = ['equity', 'debt', 'gold', 'cash', 'other'] as const
type AssetClass = (typeof ASSET_CLASSES)[number]

const COLORS: Record<AssetClass, string> = {
  equity: '#2563eb',
  debt: '#10b981',
  gold: '#f59e0b',
  cash: '#8b5cf6',
  other: '#6b7280',
}

const LABELS: Record<AssetClass, string> = {
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Gold',
  cash: 'Cash',
  other: 'Other',
}

interface AllocationData {
  target: Record<AssetClass, number>
  current: Record<AssetClass, number>
  currentPct: Record<AssetClass, number>
  total: number
}

export default function RebalancingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<AllocationData | null>(null)
  const [targets, setTargets] = useState<Record<AssetClass, string>>({
    equity: '60',
    debt: '25',
    gold: '10',
    cash: '5',
    other: '0',
  })

  const load = useCallback(async () => {
    const res = await request.get('/api/allocation-targets')
    const payload = res.data as AllocationData
    setData(payload)
    setTargets({
      equity: String(payload.target.equity ?? 0),
      debt: String(payload.target.debt ?? 0),
      gold: String(payload.target.gold ?? 0),
      cash: String(payload.target.cash ?? 0),
      other: String(payload.target.other ?? 0),
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    load()
      .catch(() => toast.error('Failed to load allocation data'))
      .finally(() => setLoading(false))
  }, [load])

  const targetTotal = useMemo(
    () => ASSET_CLASSES.reduce((sum, k) => sum + (parseFloat(targets[k]) || 0), 0),
    [targets]
  )

  const suggestions = useMemo(() => {
    if (!data) return []
    const total = data.total || 0
    return ASSET_CLASSES.map((cls) => {
      const targetPct = parseFloat(targets[cls]) || 0
      const targetValue = (targetPct / 100) * total
      const currentValue = data.current[cls] || 0
      const diff = targetValue - currentValue
      return { cls, targetPct, currentValue, targetValue, diff }
    })
  }, [data, targets])

  const currentSegments = useMemo(
    () =>
      ASSET_CLASSES.map((cls) => ({
        label: LABELS[cls],
        value: data?.currentPct[cls] ?? 0,
        color: COLORS[cls],
      })),
    [data]
  )

  const targetSegments = useMemo(
    () =>
      ASSET_CLASSES.map((cls) => ({
        label: LABELS[cls],
        value: parseFloat(targets[cls]) || 0,
        color: COLORS[cls],
      })),
    [targets]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Math.abs(targetTotal - 100) > 0.5) {
      toast.error('Target percentages must sum to 100%')
      return
    }
    setSaving(true)
    try {
      const payload = ASSET_CLASSES.reduce(
        (acc, cls) => ({ ...acc, [cls]: parseFloat(targets[cls]) || 0 }),
        {} as Record<AssetClass, number>
      )
      await request.put('/api/allocation-targets', payload)
      toast.success('Allocation targets updated')
      await load()
    } catch {
      toast.error('Failed to update targets')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rebalancing"
        subtitle="Align your portfolio with target allocation"
      />

      <FinanceStatCard
        title="Portfolio Value"
        value={data?.total ?? 0}
        loading={loading}
        variant="primary"
      />

      <Card className="space-y-6 p-5 md:p-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Current Allocation</h2>
          <AllocationBar segments={currentSegments} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Target Allocation</h2>
          <AllocationBar segments={targetSegments} />
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-sm font-semibold">Edit Target Percentages</h2>
        <FormLayout onSubmit={handleSubmit} variant="embedded">
          <FormSection>
            {ASSET_CLASSES.map((cls) => (
              <FormField key={cls} label={`${LABELS[cls]} (%)`}>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={targets[cls]}
                  onChange={(e) => setTargets({ ...targets, [cls]: e.target.value })}
                />
              </FormField>
            ))}
            <p className="form-field-full text-xs text-muted-foreground">
              Total: {targetTotal.toFixed(1)}% {Math.abs(targetTotal - 100) > 0.5 && '(should be 100%)'}
            </p>
          </FormSection>
          <FormActions>
            <SubmitButton isLoading={saving}>Save targets</SubmitButton>
          </FormActions>
        </FormLayout>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-sm font-semibold">Suggested Actions</h2>
        {loading ? (
          <div className="skeleton h-24 w-full rounded-xl" />
        ) : (
          <div className="space-y-3">
            {suggestions.map(({ cls, targetPct, currentValue, diff }) => (
              <div
                key={cls}
                className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{LABELS[cls]}</p>
                  <p className="text-xs text-muted-foreground">
                    Current {formatCurrency(currentValue)} · Target {targetPct}%
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {diff > 0 ? 'Invest ' : diff < 0 ? 'Reduce ' : 'On target '}
                  {diff !== 0 && formatCurrency(Math.abs(diff))}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
