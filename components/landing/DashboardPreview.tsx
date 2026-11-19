import { ArrowDown, ArrowUp, Landmark, LayoutDashboard, PieChart, Shield, TrendingUp, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

/* A picture of the real dashboard layout, drawn with sample figures. It is labelled as a sample so nothing here reads as real data. */

const NAV = [{ icon: LayoutDashboard, name: 'Overview', on: true }, { icon: TrendingUp, name: 'Net Worth' }, { icon: Landmark, name: 'Accounts' }, { icon: PieChart, name: 'Investments' }, { icon: Shield, name: 'Insurance' }, { icon: Wallet, name: 'Transactions' }]
const KPIS = [
  { label: 'Net worth', value: '₹90.3 L', change: '+7.4%', up: true },
  { label: 'Assets', value: '₹1.10 Cr', change: '+5.1%', up: true },
  { label: 'Liabilities', value: '₹20.0 L', change: '-3.2%', up: false, good: true },
  { label: 'Investments', value: '₹18.6 L', change: '+37.0%', up: true },
]
const TXNS = [['Groceries', 'Food', '-₹2,480'], ['Salary', 'Income', '+₹1,40,000'], ['Electricity bill', 'Bills', '-₹1,860'], ['SIP instalment', 'Investment', '-₹10,000']]
const LINE = [38, 41, 40, 46, 52, 51, 58, 63, 61, 70, 76, 84]

export function DashboardPreview() {
  const min = Math.min(...LINE), max = Math.max(...LINE)
  const pts = LINE.map((v, i) => `${((i / (LINE.length - 1)) * 100).toFixed(1)},${(92 - ((v - min) / (max - min)) * 80).toFixed(1)}`)
  return (
    <figure aria-label="Preview of the Mintmind dashboard with sample figures" className="overflow-hidden rounded-xl border border-border bg-card shadow-elevated retro:border-2 retro:border-[hsl(var(--edge))]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>{['bg-destructive/70', 'bg-warning/70', 'bg-primary'].map((c) => <i key={c} className={cn('h-2.5 w-2.5 rounded-full border border-[hsl(var(--edge))]', c)} />)}</span>
        <span className="mx-auto text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Mintmind / Overview</span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sample</span>
      </div>
      <div className="grid md:grid-cols-[11rem_1fr]">
        <nav aria-hidden className="hidden border-r border-border bg-sidebar p-3 md:block">
          <ul className="space-y-1">{NAV.map(({ icon: Icon, name, on }) => <li key={name} className={cn('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium', on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><Icon className="h-3.5 w-3.5" />{name}</li>)}</ul>
        </nav>
        <div className="min-w-0 space-y-4 p-4">
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map((k) => {
              const good = k.good ?? k.up
              return (
                <li key={k.label} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{k.label}</p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums">{k.value}</p>
                  <p className={cn('mt-0.5 flex items-center gap-1 text-[11px] font-medium tabular-nums', good ? 'text-success' : 'text-destructive')}>{k.change}{k.up ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />}</p>
                </li>
              )
            })}
          </ul>
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold">Net worth over time</p>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-2 h-32 w-full" role="img" aria-label="Sample net worth line, rising over twelve months">
                <polygon points={`0,100 ${pts.join(' ')} 100,100`} fill="hsl(var(--primary))" fillOpacity="0.2" />
                <polyline points={pts.join(' ')} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold">Recent transactions</p>
              <ul className="mt-2 divide-y divide-border">
                {TXNS.map(([n, c, a]) => (
                  <li key={n} className="flex items-center justify-between gap-2 py-1.5 text-xs"><span className="min-w-0"><span className="block truncate font-medium">{n}</span><span className="block text-[10px] text-muted-foreground">{c}</span></span><span className={cn('shrink-0 font-mono tabular-nums', a.startsWith('+') ? 'text-success' : '')}>{a}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </figure>
  )
}
