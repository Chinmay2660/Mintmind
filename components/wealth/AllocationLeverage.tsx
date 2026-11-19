'use client'

import { useMemo, type ReactNode } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { allocation, leverageMetrics } from '@/lib/wealth/leverage'
import { ASSET_LABELS } from '@/lib/wealth/labels'
import { formatINR } from '@/lib/wealth/format'
import { Money } from './Money'
import { Empty, InfoTip, Panel, chartColor } from './kit'
import { cn } from '@/lib/utils'

type Slot = 1 | 2 | 3 | 4 | 5 | 6
const slot = (i: number) => (((i % 6) + 1) as Slot)

const BAND: Record<string, { label: string; cls: string }> = {
  comfortable: { label: 'Comfortable', cls: 'border-primary/50 bg-primary/15' },
  watch: { label: 'Keep an eye on it', cls: 'border-warning/60 bg-warning/15' },
  high: { label: 'High', cls: 'border-destructive/60 bg-destructive/15 text-destructive' },
}

/** What you own by class, and how much of it is financed by debt. Figures with missing inputs are left out. */
export function AllocationLeverage() {
  const { data, netWorth } = useWealth()
  const income = Number(data.meta.find((m: any) => m.key === 'profile')?.value?.monthlyIncome) || 0
  const alloc = useMemo(() => allocation(netWorth.assetBreakdown), [netWorth.assetBreakdown])
  const m = useMemo(
    () => leverageMetrics({ assets: netWorth.assets, liabilities: netWorth.liabilities, bank: netWorth.assetBreakdown.bank || 0, loans: data.liabilities as any[], assetList: data.assets as any[], cards: data.cards as any[], monthlyIncome: income }),
    [netWorth, data.liabilities, data.assets, data.cards, income]
  )
  if (!alloc.length && !netWorth.liabilities) return null

  const rows: { label: string; info: string; value: ReactNode; hint?: ReactNode }[] = []
  if (m.debtToAssetsPct != null) rows.push({ label: 'Debt to assets', info: 'Everything you owe as a share of everything you own. Lower means less of your wealth is borrowed.', value: `${m.debtToAssetsPct}%` })
  if (m.leverageMultiple != null) rows.push({ label: 'Leverage', info: 'Total assets for every rupee of your own money (net worth). 1.00x means no debt. 2.00x means half of what you own is financed by debt.', value: `${m.leverageMultiple.toFixed(2)}x` })
  if (m.debtToNetWorthPct != null) rows.push({ label: 'Debt to net worth', info: 'What you owe against your own money. Above 100% means you owe more than your net worth.', value: `${m.debtToNetWorthPct}%` })
  if (m.monthlyRepayments > 0) {
    const band = m.emiBand ? BAND[m.emiBand] : null
    rows.push({
      label: 'Monthly repayments',
      info: 'The EMIs you entered on your loans, added together.',
      value: <Money value={m.monthlyRepayments} />,
      hint: m.emiToIncomePct != null && band
        ? <span className="flex flex-wrap items-center justify-end gap-1.5">{m.emiToIncomePct}% of income <span className={cn('rounded-full border px-2 py-px text-[11px] font-bold', band.cls)}>{band.label}</span><InfoTip label="Repayment bands">Up to 30% of income is usually seen as comfortable, 30 to 40% as worth watching and above 40% as high. These are rules of thumb, not advice. Your income comes from Settings, Account.</InfoTip></span>
        : 'Add your monthly income in Settings to see this against income',
    })
  }
  if (m.weightedRatePct != null) rows.push({ label: 'Average interest rate', info: 'The rate on each loan weighted by how much is still owed on it.', value: `${m.weightedRatePct}%` })
  if (m.cardUtilisationPct != null) rows.push({ label: 'Card limit used', info: 'Card dues against the total limit of your credit cards. Under 30% is usually good for your credit score.', value: `${m.cardUtilisationPct}%` })
  if (m.liquidCoveragePct != null) rows.push({ label: 'Cash against debt', info: 'Your bank and cash balances as a share of everything you owe.', value: `${m.liquidCoveragePct}%`, hint: m.monthsOfRepaymentsInCash != null ? `Covers ${m.monthsOfRepaymentsInCash} months of repayments` : undefined })

  const nameOf = (k: string) => ASSET_LABELS[k as keyof typeof ASSET_LABELS] ?? k

  return (
    <Panel title="Allocation and leverage" description="Where your assets sit, and how much of them is financed by debt. Figures that need data you have not entered are left out.">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Allocation</h4>
          {alloc.length === 0 ? <Empty title="No assets yet" /> : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full border border-border" role="img" aria-label={`Allocation: ${alloc.map((a) => `${nameOf(a.key)} ${a.pct} percent`).join(', ')}`}>
                {alloc.map((a, i) => <span key={a.key} style={{ width: `${a.pct}%`, background: chartColor(slot(i)) }} />)}
              </div>
              <ul className="mt-3 divide-y divide-border">
                {alloc.map((a, i) => (
                  <li key={a.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColor(slot(i)) }} aria-hidden /><span className="truncate">{nameOf(a.key)}</span><span className="text-xs tabular-nums text-muted-foreground">{a.pct}%</span></span>
                    <Money value={a.value} className="font-medium" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Leverage</h4>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">No loans or card dues, so nothing is borrowed.</p> : (
            <dl className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <dt className="flex items-center gap-1.5">{r.label}<InfoTip label={r.label}>{r.info}</InfoTip></dt>
                  <dd className="text-right"><span className="font-semibold tabular-nums">{r.value}</span>{r.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{r.hint}</span>}</dd>
                </div>
              ))}
            </dl>
          )}
          {m.secured.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Loans against an asset<InfoTip label="Loan to value">What is still owed on the loan as a share of the value of the asset it is linked to. Lower leaves more of the asset as your own.</InfoTip></h4>
              <ul className="divide-y divide-border">
                {m.secured.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{s.name}{s.assetName && <span className="text-muted-foreground"> on {s.assetName}</span>}</span>
                    <span className="shrink-0 tabular-nums">{s.ltvPct != null ? <><strong>{s.ltvPct}%</strong> <span className="text-xs text-muted-foreground">of {formatINR(s.assetValue)}</span></> : <span className="text-muted-foreground">no value</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
