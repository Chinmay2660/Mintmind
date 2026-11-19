'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Eye, EyeOff, Plane, ShieldCheck, Target, Users, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

/* Every figure on this grid is an invented sample so people can try the interactions. Nothing here is real data. */

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const compact = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : inr(n))

/** A tile that lifts and tints under the pointer. */
function Tile({ className, title, icon: Icon, hint, children }: { className?: string; title: string; icon: typeof Wallet; hint: string; children: ReactNode }) {
  return (
    <div
      className={cn('group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all motion-safe:hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-elevated', className)}>
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex h-9 items-center justify-between gap-3">
        <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-[18px] w-[18px]" aria-hidden /></span><h3 className="truncate text-sm font-semibold">{title}</h3></div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sample</span>
      </div>
      <p className="relative mt-2 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">{hint}</p>
      <div className="relative mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

/* ── 1. Net worth explorer ── */
const SERIES: Record<string, number[]> = {
  '1M': [88.2, 88.6, 88.1, 89.0, 89.4, 89.2, 89.9, 90.3],
  '6M': [78, 80.5, 82, 81.2, 84.6, 86.1, 85.4, 87.9, 89.1, 90.3],
  '1Y': [64, 67, 66.5, 70, 73, 72.4, 76.8, 79, 78.2, 83, 86.5, 90.3],
  ALL: [31, 38, 41, 47, 52, 58, 66, 71, 80, 90.3],
}
function NetWorthTile() {
  const [range, setRange] = useState('1Y')
  const [hover, setHover] = useState<number | null>(null)
  const pts = SERIES[range]
  const min = Math.min(...pts), max = Math.max(...pts)
  const x = (i: number) => (i / (pts.length - 1)) * 100
  const y = (v: number) => 92 - ((v - min) / (max - min || 1)) * 80
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  const i = hover ?? pts.length - 1
  const change = pts[i] - pts[Math.max(0, i - 1)]
  return (
    <Tile className="md:col-span-2 md:row-span-2" title="Net worth" icon={Wallet} hint="Switch the period and slide along the line to read any point.">
      <div className="flex items-end justify-between gap-3">
        <div className="min-h-[4.25rem]"><p className="text-xs text-muted-foreground">{hover === null ? 'Latest' : 'At this point'}</p><p className="text-3xl font-semibold tabular-nums tracking-tight">{compact(pts[i] * 1e5)}</p>
          <p className={cn('mt-0.5 text-xs font-medium tabular-nums', change >= 0 ? 'text-success' : 'text-destructive')}>{i === 0 ? 'First point' : `${change >= 0 ? '+' : '-'}${compact(Math.abs(change) * 1e5)} vs previous`}</p></div>
        <div role="tablist" aria-label="Period" className="flex rounded-lg border border-border bg-muted p-0.5">
          {Object.keys(SERIES).map((r) => <button key={r} role="tab" aria-selected={range === r} onClick={() => { setRange(r); setHover(null) }} className={cn('rounded-md px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', range === r ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>{r}</button>)}
        </div>
      </div>
      <div className="relative mt-4 min-h-40 flex-1" onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(pts.length - 1, Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1))))) }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d={`${line} L100,100 L0,100 Z`} fill="hsl(var(--primary))" fillOpacity="0.22" />
          <path d={line} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <line x1={x(i)} x2={x(i)} y1="0" y2="100" stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        </svg>
        <span aria-hidden className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary" style={{ left: `${x(i)}%`, top: `${y(pts[i])}%` }} />
      </div>
    </Tile>
  )
}

/* ── 2. Allocation donut ── */
const ALLOC = [
  { name: 'Funds', v: 41, tone: 'hsl(var(--chart-1))' },
  { name: 'Cash', v: 24, tone: 'hsl(var(--chart-2))' },
  { name: 'Property', v: 22, tone: 'hsl(var(--chart-4))' },
  { name: 'Gold', v: 13, tone: 'hsl(var(--chart-6))' },
]
function AllocationTile() {
  const [sel, setSel] = useState<number | null>(null)
  const [abs, setAbs] = useState(false)
  const total = 90.3e5
  const R = 38, C = 2 * Math.PI * R
  const cur = sel === null ? null : ALLOC[sel]
  return (
    <Tile title="Allocation" icon={Wallet} hint="Tap a slice to focus it.">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            {ALLOC.map((a, i) => {
              const len = (a.v / 100) * C; const off = (ALLOC.slice(0, i).reduce((n, x) => n + x.v, 0) / 100) * C
              return <circle key={a.name} cx="50" cy="50" r={R} fill="none" stroke={a.tone} strokeWidth={sel === i ? 15 : 12} strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-off} className="cursor-pointer transition-all duration-200" opacity={sel === null || sel === i ? 1 : 0.3} onClick={() => setSel(sel === i ? null : i)} />
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground">{cur ? cur.name : 'Total'}</span>
            <span className="text-sm font-semibold tabular-nums">{cur ? (abs ? compact((cur.v / 100) * total) : `${cur.v}%`) : compact(total)}</span>
          </div>
        </div>
        <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-0.5">
          {ALLOC.map((a, i) => (
            <li key={a.name}><button type="button" onClick={() => setSel(sel === i ? null : i)} aria-pressed={sel === i} className={cn('flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', sel === i && 'bg-muted')}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.tone }} aria-hidden /><span className="min-w-0 flex-1 truncate">{a.name}</span><span className="tabular-nums text-muted-foreground">{abs ? compact((a.v / 100) * total) : `${a.v}%`}</span></button></li>
          ))}
        </ul>
      </div>
      <button type="button" onClick={() => setAbs((v) => !v)} className="mt-3 self-start rounded-full border border-border px-3 py-1 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{abs ? 'Show percentages' : 'Show amounts'}</button>
    </Tile>
  )
}

/* ── 3. Goal planner ── */
function GoalTile() {
  const [monthly, setMonthly] = useState(25000)
  const target = 1000000, have = 340000
  const months = Math.ceil((target - have) / monthly)
  return (
    <Tile title="Goal planner" icon={Target} hint="Move the slider to see how saving more shortens the wait.">
      <div><p className="text-sm font-medium">Emergency fund</p><p className="text-xs text-muted-foreground tabular-nums">{inr(have)} of {inr(target)}</p></div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: '34%' }} /></div>
      <label className="mt-4 block text-xs text-muted-foreground" htmlFor="bento-save">Save each month: <strong className="text-foreground tabular-nums">{inr(monthly)}</strong></label>
      <input id="bento-save" type="range" min={5000} max={80000} step={5000} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} className="mt-1.5 w-full accent-[hsl(var(--primary))]" />
      <p className="mt-3 min-h-[2.5rem] text-sm">About <strong className="tabular-nums">{months} mo</strong>{months >= 12 ? <span className="text-muted-foreground tabular-nums"> ({(months / 12).toFixed(1)} yrs)</span> : null} to reach it.</p>
    </Tile>
  )
}

/* ── 4. Privacy mode ── */
function PrivacyTile() {
  const [hidden, setHidden] = useState(false)
  return (
    <Tile title="Privacy" icon={ShieldCheck} hint="One tap hides every balance when someone is looking over your shoulder.">
      <div className="rounded-xl border border-border bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">Bank and cash</p>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{hidden ? '₹ ••••••' : inr(2175000)}</p>
      </div>
      <button type="button" onClick={() => setHidden((v) => !v)} aria-pressed={hidden} className="mt-3 inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{hidden ? 'Show balances' : 'Hide balances'}
      </button>
    </Tile>
  )
}

/* ── 5. Spending bars ── */
const SPEND = [{ n: 'Food', v: 14200 }, { n: 'Travel', v: 9800 }, { n: 'Bills', v: 8600 }, { n: 'Shopping', v: 6100 }]
function SpendTile() {
  const [sel, setSel] = useState(0)
  const total = useMemo(() => SPEND.reduce((s, x) => s + x.v, 0), [])
  const max = Math.max(...SPEND.map((s) => s.v))
  return (
    <Tile title="Monthly spend" icon={Wallet} hint="Pick a category to see its share.">
      <ul className="space-y-2">
        {SPEND.map((s, i) => (
          <li key={s.n}><button type="button" onClick={() => setSel(i)} aria-pressed={sel === i} className={cn('grid w-full grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', sel === i && 'bg-muted')}>
            <span>{s.n}</span><span className="h-2 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${(s.v / max) * 100}%`, opacity: sel === i ? 1 : 0.55 }} /></span><span className="text-right tabular-nums text-muted-foreground">{compact(s.v)}</span></button></li>
        ))}
      </ul>
      <p className="mt-3 min-h-[2.5rem] text-sm"><strong>{SPEND[sel].n}</strong> is <strong className="tabular-nums">{Math.round((SPEND[sel].v / total) * 100)}%</strong> of this month&apos;s spending.</p>
    </Tile>
  )
}

/* ── 6. Offline ── */
function OfflineTile() {
  const [off, setOff] = useState(false)
  return (
    <Tile title="Offline" icon={Plane} hint="Your data lives on your device, so the app keeps working without a connection.">
      <div className={cn('flex min-h-[3rem] items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors', off ? 'border-warning/50 bg-warning/10' : 'border-border bg-muted/50')}>
        <span className="font-medium">{off ? 'Offline' : 'Online'}</span>
        <span className="text-xs text-muted-foreground">{off ? 'Still adding and reading entries' : 'Everything saved to your account'}</span>
      </div>
      <button type="button" onClick={() => setOff((v) => !v)} aria-pressed={off} className="mt-3 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{off ? 'Go back online' : 'Try airplane mode'}</button>
    </Tile>
  )
}

/* ── 7. Family ── */
const PEOPLE = [{ n: 'Arjun', v: 5200000 }, { n: 'Priya', v: 2900000 }, { n: 'Shared', v: 930000 }]
function FamilyTile() {
  const [sel, setSel] = useState<number | 'all'>('all')
  const total = PEOPLE.reduce((s, p) => s + p.v, 0)
  const shown = sel === 'all' ? total : PEOPLE[sel].v
  return (
    <Tile className="md:col-span-3" title="Family" icon={Users} hint="Look at everyone together, or one person at a time.">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs text-muted-foreground">{sel === 'all' ? 'Whole family' : PEOPLE[sel].n}</p><p className="text-3xl font-semibold tabular-nums tracking-tight">{compact(shown)}</p></div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 0, 1, 2] as const).map((k) => <button key={String(k)} type="button" aria-pressed={sel === k} onClick={() => setSel(k)} className={cn('rounded-full border px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', sel === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>{k === 'all' ? 'Everyone' : PEOPLE[k].n}</button>)}
        </div>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-border">
        {PEOPLE.map((p, i) => <span key={p.n} className="h-full transition-all duration-300" style={{ width: `${(p.v / total) * 100}%`, background: `hsl(var(--chart-${[1, 2, 4][i]}))`, opacity: sel === 'all' || sel === i ? 1 : 0.25 }} />)}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {PEOPLE.map((p, i) => (
          <li key={p.n}><button type="button" onClick={() => setSel(sel === i ? 'all' : i)} aria-pressed={sel === i} className={cn('flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', sel === i ? 'border-primary bg-muted' : 'border-border')}>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: `hsl(var(--chart-${[1, 2, 4][i]}))` }} aria-hidden />{p.n}</span>
            <span className="tabular-nums text-muted-foreground">{compact(p.v)} · {Math.round((p.v / total) * 100)}%</span></button></li>
        ))}
      </ul>
    </Tile>
  )
}

export function BentoGrid() {
  return (
    <div className="grid auto-rows-[minmax(11rem,auto)] gap-4 md:grid-cols-4">
      <NetWorthTile />
      <AllocationTile />
      <GoalTile />
      <PrivacyTile />
      <SpendTile />
      <OfflineTile />
      <FamilyTile />
    </div>
  )
}
