'use client'

import { useMemo, type ReactNode } from 'react'
import { growthVs, portfolioSummary } from '@/lib/wealth/calc'
import { useWealth } from '@/lib/wealth/WealthContext'
import { Money } from './Money'
import { Empty, Metric, Panel, Stat, FootNote } from './kit'

const LOANS = ['homeLoan', 'carLoan', 'personalLoan', 'educationLoan', 'otherLoan']
const INVESTMENTS = ['mutualFunds', 'stocks', 'etf', 'epf', 'ppf', 'nps', 'fd', 'rd']

type Item = { label: string; info: string; value: ReactNode; hint?: ReactNode }

/**
 * The figures that can be worked out from what the person entered, each with its definition.
 * A figure whose data is missing is left out rather than shown as zero or guessed.
 */
export function FinancialMetrics() {
  const { ready, data, netWorth } = useWealth()
  const groups = useMemo(() => {
    if (!ready) return []
    const b = netWorth.assetBreakdown as Record<string, number>
    const l = netWorth.liabilityBreakdown as Record<string, number>
    const A = netWorth.assets, L = netWorth.liabilities
    const share = (n: number) => (A > 0 ? `${((n / A) * 100).toFixed(1)}% of assets` : undefined)
    const today = new Date()
    const month = growthVs(data.snapshots, netWorth.netWorth, 1, today)
    const year = growthVs(data.snapshots, netWorth.netWorth, 12, today)
    const prev = [...data.snapshots].sort((x: any, y: any) => y.date.localeCompare(x.date)).find((s: any) => s.date.slice(0, 7) !== today.toISOString().slice(0, 7))
    const p = data.funds.length ? portfolioSummary(data.funds, data.fundTxns, data.sips, today) : null
    const sumOf = (keys: string[], src: Record<string, number>) => keys.reduce((n, k) => n + (src[k] || 0), 0)
    const inv = sumOf(INVESTMENTS, b), loans = sumOf(LOANS, l), cards = l.creditCards || 0
    const emi = data.liabilities.reduce((n: number, x: any) => n + (Number(x.emi) || 0), 0)
    const rest = (b.vehicle || 0) + (b.other || 0)

    const net: Item[] = []
    if (A > 0 || L > 0) {
      net.push({ label: 'Net worth', info: 'Your total assets minus your total liabilities.', value: <Money value={netWorth.netWorth} /> })
      if (L > 0 && A > 0) net.push({ label: 'Asset-to-liability ratio', info: 'Total assets divided by total liabilities. Above 1 means you own more than you owe.', value: `${(A / L).toFixed(2)} : 1` })
      if (A > 0) net.push({ label: 'Debt-to-asset ratio', info: 'Total liabilities as a share of total assets. Lower means less of what you own is financed by debt.', value: `${((L / A) * 100).toFixed(1)}%` })
      if (month) net.push({ label: 'Change this month', info: 'Net worth now compared with your latest saved snapshot on or before one month ago.', value: <Metric amount={month.diff} pct={month.pct} className="text-lg font-semibold sm:text-xl" /> })
      if (year) net.push({ label: 'Change this year', info: 'Net worth now compared with your latest saved snapshot on or before one year ago.', value: <Metric amount={year.diff} pct={year.pct} className="text-lg font-semibold sm:text-xl" /> })
    }

    const assets: Item[] = []
    if (A > 0) {
      assets.push({ label: 'Total assets', info: 'Everything you own, at the values you entered or the latest NAV.', value: <Money value={A} /> })
      if (b.bank) assets.push({ label: 'Cash and bank', info: 'Balances of your bank accounts and cash.', value: <Money value={b.bank} />, hint: share(b.bank) })
      if (inv) assets.push({ label: 'Investments', info: 'Mutual funds, stocks, EPF, PPF, NPS and fixed deposits together.', value: <Money value={inv} />, hint: share(inv) })
      if (b.realEstate) assets.push({ label: 'Real estate', info: 'The value you entered for property.', value: <Money value={b.realEstate} />, hint: share(b.realEstate) })
      if (b.gold) assets.push({ label: 'Gold', info: 'The value you entered for gold.', value: <Money value={b.gold} />, hint: share(b.gold) })
      if (rest) assets.push({ label: 'Other assets', info: 'Vehicles and anything else you added.', value: <Money value={rest} />, hint: share(rest) })
    }

    const liab: Item[] = []
    if (L > 0) {
      liab.push({ label: 'Total liabilities', info: 'Everything you owe: loans and credit card dues.', value: <Money value={L} /> })
      if (loans) liab.push({ label: 'Loan balance', info: 'Outstanding principal on home, car, personal, education and other loans.', value: <Money value={loans} /> })
      if (cards) liab.push({ label: 'Credit card outstanding', info: 'What is currently owed across your credit cards.', value: <Money value={cards} /> })
      if (emi) liab.push({ label: 'Monthly repayments', info: 'The EMIs you entered on your loans, added together.', value: <Money value={emi} /> })
      if (prev && typeof prev.liabilities === 'number') {
        const d = L - prev.liabilities
        liab.push({ label: 'Change since last snapshot', info: 'Total liabilities now compared with your previous saved month. A fall is good news.', value: <Metric amount={d} invertGood className="text-lg font-semibold sm:text-xl" />, hint: `vs ${prev.date}` })
      }
    }

    const invest: Item[] = []
    if (p && p.invested > 0) {
      invest.push({ label: 'Invested', info: 'Money you put into mutual funds, including SIP instalments.', value: <Money value={p.invested} /> })
      invest.push({ label: 'Current value', info: 'Units held multiplied by each fund\'s latest NAV.', value: <Money value={p.value} /> })
      invest.push({ label: 'Absolute return', info: 'Current value minus invested. Ignores how long the money was invested.', value: <Metric amount={p.absReturn} pct={p.absReturnPct} className="text-lg font-semibold sm:text-xl" /> })
      invest.push({ label: 'Unrealised gain', info: 'The gain on holdings you still own. Sales are not recorded in this app yet, so realised gains cannot be shown.', value: <Metric amount={p.absReturn} className="text-lg font-semibold sm:text-xl" />, hint: 'Realised gains: not tracked' })
      if (p.xirrPct != null) invest.push({ label: 'XIRR', info: 'Your annualised return, taking into account when each rupee went in.', value: <Metric pct={p.xirrPct} digits={2} className="text-lg font-semibold sm:text-xl" /> })
    }
    return [
      { title: 'Net worth', items: net, empty: 'Add an account, fund or asset and your net worth figures appear here.' },
      { title: 'Assets', items: assets, empty: 'Your asset figures appear here once you add accounts, funds or other assets.' },
      { title: 'Liabilities', items: liab, empty: 'No loans or card dues recorded, so there is nothing to show here.' },
      { title: 'Investments', items: invest, empty: 'Add a mutual fund to see invested amount, value and returns.' },
    ]
  }, [ready, data, netWorth])

  if (!ready) return null
  return (
    <Panel title="Financial metrics" description="Only figures that can be worked out from your own entries are shown. Each has a short definition behind the i.">
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{g.title}</h4>
            {g.items.length === 0 ? <Empty title={g.empty} /> : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{g.items.map((i) => <Stat key={i.label} label={i.label} info={i.info} value={i.value} hint={i.hint} />)}</div>
            )}
          </section>
        ))}
      </div>
      <FootNote className="mt-4">Monthly and yearly changes use the net worth snapshots saved as you use the app, so they appear once there is enough history.</FootNote>
    </Panel>
  )
}
