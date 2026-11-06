'use client'

import { useMemo, useState } from 'react'
import { Banknote, TrendingUp, Baby, Car, Home, HandCoins, ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Key = 'lumpsum' | 'raise' | 'child' | 'car' | 'home' | 'loan'
const SCENARIOS: { key: Key; label: string; icon: LucideIcon; title: string; unit: string; min: number; max: number; step: number; def: number; note: string }[] = [
  { key: 'lumpsum', label: 'Lumpsum', icon: Banknote, title: 'Invest a lumpsum', unit: 'amount', min: 100000, max: 5000000, step: 50000, def: 1000000, note: 'Invested today and left to grow' },
  { key: 'raise', label: 'Raise', icon: TrendingUp, title: 'Get a raise', unit: 'extra per month', min: 5000, max: 100000, step: 5000, def: 25000, note: 'Extra income, assumed saved' },
  { key: 'child', label: 'Child', icon: Baby, title: 'Have a child', unit: 'extra cost per month', min: 10000, max: 80000, step: 5000, def: 30000, note: 'For the next 20 years' },
  { key: 'car', label: 'Car', icon: Car, title: 'Buy a car', unit: 'car price', min: 300000, max: 3000000, step: 50000, def: 1100000, note: 'Paid upfront, plus running costs of 0.7% a month' },
  { key: 'home', label: 'Home', icon: Home, title: 'Buy a home', unit: 'home price', min: 2000000, max: 20000000, step: 500000, def: 7500000, note: '20% down, rest on a 20-year EMI' },
  { key: 'loan', label: 'Loan', icon: HandCoins, title: 'Take a loan', unit: 'loan amount', min: 100000, max: 3000000, step: 50000, def: 800000, note: '5-year EMI at 11%' },
]

const YEARS = 25, GROWTH = 0.09
const BASE = { networth: 1500000, save: 40000 } // sample family: monthly savings

const emi = (p: number, rate: number, yrs: number) => { const r = rate / 12, n = yrs * 12; return (p * r * (1 + r) ** n) / ((1 + r) ** n - 1) }
function fmt(n: number) {
  const a = Math.abs(n), sign = n < 0 ? '-' : ''
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`
  if (a >= 1e3) return `${sign}₹${(a / 1e3).toFixed(1)}K`
  return `${sign}₹${Math.round(a)}`
}

function project(key: Key | null, amt: number) {
  let nw = BASE.networth, monthly = BASE.save
  const pts = [nw]
  let upfront = 0, extraMonthly = 0, extraYears = YEARS, income = 0
  if (key === 'lumpsum') nw += amt
  if (key === 'raise') income = amt
  if (key === 'child') { extraMonthly = amt; extraYears = 20 }
  if (key === 'car') { upfront = amt; extraMonthly = amt * 0.007 }
  if (key === 'home') { upfront = amt * 0.2; extraMonthly = emi(amt * 0.8, 0.09, 20); extraYears = 20 }
  if (key === 'loan') { extraMonthly = emi(amt, 0.11, 5); extraYears = 5 }
  nw -= upfront
  pts[0] = nw
  for (let y = 1; y <= YEARS; y++) {
    const m = monthly + income - (y <= extraYears ? extraMonthly : 0)
    nw = nw * (1 + GROWTH) + m * 12 * (1 + GROWTH / 2)
    pts.push(nw)
    monthly *= 1.05 // savings grow with income
  }
  const room = BASE.save + income - extraMonthly
  return { pts, room, end: pts[YEARS] }
}

export function SampleSimulator() {
  const [key, setKey] = useState<Key>('car')
  const sc = SCENARIOS.find((s) => s.key === key)!
  const [amts, setAmts] = useState<Record<Key, number>>(() => Object.fromEntries(SCENARIOS.map((s) => [s.key, s.def])) as Record<Key, number>)
  const amt = amts[key]
  const base = useMemo(() => project(null, 0), [])
  const after = useMemo(() => project(key, amt), [key, amt])

  const W = 560, H = 200, PAD = 8
  const max = Math.max(...base.pts, ...after.pts), min = Math.min(0, ...base.pts, ...after.pts)
  const x = (i: number) => PAD + (i / YEARS) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2)
  const path = (pts: number[]) => pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  const dEnd = after.end - base.end, dRoom = after.room - base.room
  const good = dEnd >= 0
  const verdict = after.room < 0 ? 'Monthly cash goes negative' : dEnd < -base.end * 0.25 ? 'Big dent in your future net worth' : dEnd < 0 ? 'Affordable, with a small trade-off' : 'Adds to your long-term wealth'

  const stats = [
    { label: `Net worth in ${YEARS} years`, value: fmt(after.end), delta: dEnd },
    { label: 'Left to save each month', value: fmt(after.room), delta: dRoom },
    { label: 'Today’s net worth', value: fmt(after.pts[0]), delta: after.pts[0] - BASE.networth },
  ]

  return (
    <section id="try" aria-labelledby="try-h" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-sm font-medium text-primary">Try it live</p>
        <h2 id="try-h" className="mt-1 text-2xl font-semibold tracking-tight">Test a big decision on a sample family.</h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">Pick a life event, move the slider and watch net worth and monthly room change over 25 years. Sample numbers, nothing to sign up for.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <div role="tablist" aria-label="Life event" className="grid grid-cols-3 gap-2">
              {SCENARIOS.map(({ key: k, label, icon: Icon }) => (
                <button key={k} role="tab" aria-selected={k === key} onClick={() => setKey(k)} className={cn('flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', k === key ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-muted')}>
                  <Icon className="h-5 w-5" />{label}
                </button>
              ))}
            </div>
            <div className="surface-card mt-4 p-4">
              <label htmlFor="sim-amt" className="flex items-baseline justify-between text-sm"><span className="font-medium">{sc.title}</span><span className="text-xs text-muted-foreground">{sc.unit}</span></label>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{fmt(amt)}</p>
              <input id="sim-amt" type="range" min={sc.min} max={sc.max} step={sc.step} value={amt} onChange={(e) => setAmts((a) => ({ ...a, [key]: Number(e.target.value) }))} className="mt-3 w-full accent-[hsl(var(--primary))]" />
              <p className="mt-2 text-xs text-muted-foreground">{sc.note}</p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Sample family: ₹15L net worth, ₹40K saved a month, 9% yearly growth. Illustration only, not advice.</p>
          </div>

          <div className="surface-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{sc.title}</h3><span className="text-xs text-muted-foreground">Sample family</span></div>
            <p className={cn('mt-3 rounded-lg px-3 py-2 text-sm font-medium', after.room < 0 ? 'bg-destructive/10 text-destructive' : good ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')} aria-live="polite">{verdict}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">{s.value}</dd>
                  <dd className={cn('mt-0.5 flex items-center gap-1 text-xs tabular-nums', Math.abs(s.delta) < 1 ? 'text-muted-foreground' : s.delta > 0 ? 'text-success' : 'text-destructive')}>
                    {s.delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : s.delta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}{Math.abs(s.delta) < 1 ? 'No change' : fmt(Math.abs(s.delta))}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-foreground/60" />Current path</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" />After this</span></div>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Projected net worth over ${YEARS} years, current path versus after ${sc.title.toLowerCase()}`} className="mt-2 h-auto w-full">
              {[0, 1, 2, 3].map((i) => <line key={i} x1={PAD} x2={W - PAD} y1={PAD + (i * (H - PAD * 2)) / 3} y2={PAD + (i * (H - PAD * 2)) / 3} stroke="hsl(var(--border))" strokeDasharray="2 4" />)}
              <path d={path(base.pts)} fill="none" stroke="hsl(var(--foreground) / 0.6)" strokeWidth="2" strokeDasharray="5 4" />
              <path d={path(after.pts)} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.3s' }} />
              <circle cx={x(YEARS)} cy={y(after.end)} r="4.5" fill="hsl(var(--primary))" />
            </svg>
            <div className="flex justify-between px-1 text-[11px] text-muted-foreground"><span>Now</span><span>Yr 5</span><span>Yr 10</span><span>Yr 15</span><span>Yr 20</span><span>Yr 25</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
