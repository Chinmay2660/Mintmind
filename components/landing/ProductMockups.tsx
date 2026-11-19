'use client'

import { useState, type ReactNode } from 'react'
import { BarChart3, Gauge, LineChart, Target, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

/* Mockups of the product: an app window with tabs, and a phone showing the same screen.
   Drawn with the app's own colours and type. Every figure is a sample and the mockup says so. */

type Tab = 'networth' | 'spending' | 'investments' | 'planning'
const TABS: { key: Tab; label: string; icon: typeof Wallet }[] = [
  { key: 'networth', label: 'Net worth', icon: Wallet },
  { key: 'spending', label: 'Spending', icon: BarChart3 },
  { key: 'investments', label: 'Investments', icon: LineChart },
  { key: 'planning', label: 'Planning', icon: Target },
]

const SPEND = [38, 92, 14, 30, 8, 18, 6, 10, 5, 4, 36, 4, 8, 6, 5, 76, 28, 6, 8, 12, 5, 11, 7, 5]
const NW = [44, 46, 45, 49, 53, 52, 57, 60, 59, 65, 70, 76, 74, 82, 88]
const PF = [30, 33, 31, 38, 41, 40, 47, 52, 49, 58, 63, 61, 70, 76, 83]

const path = (pts: number[], w = 100, h = 60, pad = 6) => {
  const min = Math.min(...pts), max = Math.max(...pts)
  return pts.map((v, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * w).toFixed(1)},${(h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)).toFixed(1)}`).join(' ')
}

const Label = ({ children }: { children: ReactNode }) => <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</p>

function Screen({ tab, compact }: { tab: Tab; compact?: boolean }) {
  if (tab === 'networth') {
    const d = path(NW)
    return (
      <div className="space-y-3">
        <div><Label>Net worth · now</Label><p className={cn('font-mono font-semibold tabular-nums', compact ? 'text-xl' : 'text-3xl')}>₹90,32,418</p><p className="text-[11px] font-medium text-success">+₹6.19 L (+7.4%) <span className="text-muted-foreground">vs last month</span></p></div>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={cn('w-full', compact ? 'h-24' : 'h-40')}>
          <path d={`${d} L100,60 L0,60 Z`} fill="hsl(var(--primary))" fillOpacity="0.22" />
          <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <div><Label>Where it sits</Label>
          <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full border border-border">
            {[['chart-1', 41], ['chart-2', 24], ['chart-4', 22], ['chart-6', 13]].map(([c, w]) => <span key={c as string} style={{ width: `${w}%`, background: `hsl(var(--${c}))` }} />)}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Funds 41% · Cash 24% · Property 22% · Gold 13%</p>
        </div>
      </div>
    )
  }
  if (tab === 'spending') {
    const max = Math.max(...SPEND)
    return (
      <div className="space-y-3">
        <div><Label>Spent · last month</Label><p className={cn('font-mono font-semibold tabular-nums', compact ? 'text-xl' : 'text-3xl')}>₹42,093</p><p className="text-[11px] font-medium text-destructive">+₹3,760 (+8.1%) <span className="text-muted-foreground">from the month before</span></p></div>
        <div className={cn('flex items-end gap-[3px]', compact ? 'h-24' : 'h-40')}>
          {SPEND.map((v, i) => <span key={i} className="flex-1 rounded-t-sm bg-chart-3" style={{ height: `${(v / max) * 100}%`, opacity: v === max ? 1 : 0.7 }} />)}
        </div>
        {!compact && (
          <ul className="space-y-1.5 text-[11px]">
            {[['Needs', 81.7, '₹34,400'], ['Wants', 18.1, '₹7,600'], ['Other', 0.2, '₹93']].map(([n, p, a]) => (
              <li key={n as string} className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-2"><span>{n}</span><span className="h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-chart-1" style={{ width: `${p}%` }} /></span><span className="text-right font-mono tabular-nums">{a}</span></li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  if (tab === 'investments') {
    const d = path(PF)
    return (
      <div className="space-y-3">
        <div><Label>Portfolio · now</Label><p className={cn('font-mono font-semibold tabular-nums', compact ? 'text-xl' : 'text-3xl')}>₹18,55,478</p><p className="text-[11px] font-medium text-success">+₹5,00,482 (+36.9%) <span className="text-muted-foreground">XIRR 17.0%</span></p></div>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={cn('w-full', compact ? 'h-20' : 'h-32')}>
          <path d={d} fill="none" stroke="hsl(var(--chart-4))" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <ul className="divide-y divide-border text-[11px]">
          {[['Flexi Cap Fund', '+12.4%'], ['Index Fund', '+9.8%'], ['Small Cap Fund', '+44.1%']].slice(0, compact ? 2 : 3).map(([n, r]) => <li key={n} className="flex justify-between py-1.5"><span>{n}</span><span className="font-mono font-semibold tabular-nums text-success">{r}</span></li>)}
        </ul>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div><Label>Goals · on track</Label><p className={cn('font-mono font-semibold tabular-nums', compact ? 'text-xl' : 'text-3xl')}>2 of 3</p></div>
      <ul className="space-y-3">
        {[['Emergency fund', 69, '₹2.5 L of ₹3.6 L'], ['Child education', 30, '₹7.4 L of ₹25 L'], ['Marriage fund', 78, '₹7.8 L of ₹10 L']].slice(0, compact ? 2 : 3).map(([n, p, a]) => (
          <li key={n as string}><div className="flex justify-between text-[11px]"><span className="font-medium">{n}</span><span className="font-mono tabular-nums text-muted-foreground">{a}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full border border-border bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} /></div></li>
        ))}
      </ul>
    </div>
  )
}

/** An app window with a tab strip and a phone showing the same screen. Switch the tab and both change. */
export function ProductMockups() {
  const [tab, setTab] = useState<Tab>('networth')
  return (
    <figure aria-label="Mockups of the Mintmind app with sample figures">
      <div role="tablist" aria-label="Product screens" className="mx-auto mb-5 flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-full border border-border bg-muted p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', tab === key ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="h-3.5 w-3.5" aria-hidden />{label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'center', gap: '1.5rem', maxWidth: '62rem', margin: '0 auto' }}>
        {/* the app window */}
        <div style={{ flex: '1 1 30rem', minWidth: 0 }} className="overflow-hidden rounded-xl border-2 border-[hsl(var(--edge))] bg-card shadow-elevated">
          <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-2">
            <span className="flex gap-1.5" aria-hidden>{['bg-destructive/70', 'bg-warning/70', 'bg-primary'].map((c) => <i key={c} className={cn('h-2.5 w-2.5 rounded-full border border-[hsl(var(--edge))]', c)} />)}</span>
            <span className="mx-auto text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Mintmind · {TABS.find((t) => t.key === tab)!.label}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Sample</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3.25rem minmax(0, 1fr)' }}>
            <nav aria-hidden style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} className="border-r border-border bg-sidebar py-3">
              {TABS.map(({ key, icon: Icon }) => <span key={key} className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tab === key ? 'border border-[hsl(var(--edge))] bg-primary text-primary-foreground shadow-[1px_2px_0_0_hsl(var(--drop))]' : 'text-muted-foreground')}><Icon className="h-4 w-4" /></span>)}
              <span className="mt-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground"><Gauge className="h-4 w-4" /></span>
            </nav>
            <div className="min-h-[19rem] p-5"><Screen tab={tab} /></div>
          </div>
        </div>

        {/* the phone */}
        <div style={{ width: '13.5rem', flex: '0 0 auto' }} aria-hidden>
          <div className="rounded-[2rem] border-2 border-[hsl(var(--edge))] bg-card p-2 shadow-elevated">
            <div className="rounded-[1.5rem] border border-border bg-background p-3">
              <div className="mx-auto mb-2 h-1.5 w-14 rounded-full bg-border" />
              <div className="mb-2 flex items-center justify-between text-[9px] font-bold text-muted-foreground"><span>9:41</span><span>●●●</span></div>
              <div className="min-h-[15rem]"><Screen tab={tab} compact /></div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-muted-foreground">Sample figures, not real data. The same screens work on a phone, a tablet and a desktop.</figcaption>
    </figure>
  )
}
