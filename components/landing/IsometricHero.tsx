'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* An isometric financial workspace: a blueprint-grid platform with dashboard cards floating above it.
   Everything is drawn from the same colour tokens as the app, so it follows the style and light or dark mode.
   The figures are invented samples (the illustration says so). */

type Key = 'networth' | 'allocation' | 'portfolio' | 'summary'

const PARTS: { key: Key; label: string; note: string }[] = [
  { key: 'networth', label: 'Net worth', note: 'Everything you own minus everything you owe, over time.' },
  { key: 'allocation', label: 'Asset allocation', note: 'How your wealth is spread across funds, cash, property and gold.' },
  { key: 'portfolio', label: 'Investments', note: 'What you put in, what it is worth now, and the return.' },
  { key: 'summary', label: 'Summary', note: 'Income, spending and what is left, at a glance.' },
]

const INK = 'hsl(var(--border))'

/** One card lying on the plane at height z. It lifts when active and floats gently otherwise. */
function Card({ k, active, onActive, z, x, y, w, h, delay, children }: { k: Key; active: Key | null; onActive: (k: Key | null) => void; z: number; x: number; y: number; w: number; h: number; delay: number; children: ReactNode }) {
  const lift = active === k ? 30 : 0
  const base: CSSProperties = { left: x, top: y, width: w, height: h, transformStyle: 'preserve-3d' }
  return (
    <>
      {/* soft shadow on the platform below the card */}
      <div aria-hidden className="absolute rounded-lg transition-opacity duration-300" style={{ ...base, transform: `translate3d(${6 + lift / 3}px, ${8 + lift / 3}px, 1px)`, background: 'hsl(var(--foreground) / 0.10)', opacity: active === k ? 1 : 0.8 }} />
      <div className="absolute transition-transform duration-200 motion-reduce:transition-none" style={{ ...base, transform: `translateZ(${z + lift}px)`, backfaceVisibility: 'hidden' }}
        onPointerEnter={() => onActive(k)} onPointerLeave={() => onActive(null)}>
        <div className={cn('h-full w-full overflow-hidden rounded-lg border bg-card p-2.5 text-card-foreground transition-shadow duration-300', active === k ? 'shadow-elevated' : 'shadow-card')}
          style={{ borderColor: INK }}>
          {children}
        </div>
      </div>
    </>
  )
}

const Tag = ({ children }: { children: ReactNode }) => <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</p>

export function IsometricHero() {
  const [active, setActive] = useState<Key | null>(null)
  const shown = PARTS.find((p) => p.key === active)

  return (
    <figure className="w-full" aria-label="Illustration of a financial workspace with sample dashboard cards">
      <div
        className="relative mx-auto h-[300px] w-full max-w-[460px] select-none sm:h-[380px] lg:h-[430px]">
        {/* scale the fixed-size scene to the space available */}
        <div className="absolute left-1/2 top-1/2 origin-center scale-[0.66] sm:scale-[0.84] lg:scale-100" style={{ width: 330, height: 330, marginLeft: -165, marginTop: -165 }}>
          <div className="relative h-full w-full transition-transform duration-300 ease-out"
            style={{ transformStyle: 'preserve-3d', transform: 'rotateX(58deg) rotateZ(-45deg)' }}>

            {/* the platform: stacked layers give it thickness, the top face is a blueprint grid */}
            {[0, 1].map((i) => (
              <div key={i} aria-hidden className="absolute inset-0 rounded-xl" style={{ transform: `translateZ(${-i * 6}px)`, background: 'hsl(var(--secondary))', border: `1px solid ${INK}` }} />
            ))}
            <div aria-hidden className="absolute inset-0 overflow-hidden rounded-xl" style={{ transform: 'translateZ(0.5px)', border: `1px solid ${INK}`, background: 'hsl(var(--card))' }}>
              <svg className="h-full w-full" aria-hidden>
                <defs><pattern id="iso-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.14" strokeWidth="1" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#iso-grid)" />
              </svg>
            </div>
            {/* blueprint dimension marks */}
            <p aria-hidden className="absolute -bottom-6 left-0 right-0 text-center font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground" style={{ transform: 'translateZ(1px)' }}>Fig. 01 · Your financial workspace</p>

            <Card k="networth" active={active} onActive={setActive} z={64} x={14} y={14} w={176} h={104} delay={0}>
              <Tag>Net worth</Tag>
              <p className="mt-0.5 font-mono text-[19px] font-semibold leading-none tabular-nums">₹90.3 L</p>
              <p className="mt-1 text-[9px] font-medium text-success">▲ 7.4% this month</p>
              <svg viewBox="0 0 100 26" className="mt-1.5 h-[34px] w-full" preserveAspectRatio="none" aria-hidden>
                <path d="M0,22 L12,19 L24,20 L36,15 L48,16 L60,10 L72,12 L84,6 L100,2 L100,26 L0,26 Z" fill="hsl(var(--primary) / 0.28)" />
                <path d="M0,22 L12,19 L24,20 L36,15 L48,16 L60,10 L72,12 L84,6 L100,2" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
              </svg>
            </Card>

            <Card k="allocation" active={active} onActive={setActive} z={36} x={200} y={22} w={112} h={112} delay={0.4}>
              <Tag>Allocation</Tag>
              <svg viewBox="0 0 100 100" className="mx-auto mt-1 h-[72px] w-[72px] -rotate-90" aria-hidden>
                {[['chart-1', 41, 0], ['chart-2', 24, 41], ['chart-4', 22, 65], ['chart-6', 13, 87]].map(([c, v, o]) => (
                  <circle key={c as string} cx="50" cy="50" r="34" fill="none" stroke={`hsl(var(--${c}))`} strokeWidth="14" pathLength={100} strokeDasharray={`${(v as number) - 1.5} 100`} strokeDashoffset={-(o as number)} />
                ))}
              </svg>
            </Card>

            <Card k="portfolio" active={active} onActive={setActive} z={30} x={14} y={138} w={150} h={88} delay={0.8}>
              <Tag>Investments</Tag>
              <div className="mt-1 flex items-end justify-between gap-1" aria-hidden>
                <div><p className="font-mono text-[12px] font-semibold leading-none tabular-nums">₹18.6 L</p><p className="mt-0.5 text-[9px] font-medium text-success">▲ 37.0%</p></div>
                <div className="flex h-9 items-end gap-[3px]">{[40, 55, 48, 70, 62, 88].map((h, i) => <span key={i} className="w-[7px] rounded-sm bg-primary" style={{ height: `${h}%`, opacity: 0.5 + i * 0.1 }} />)}</div>
              </div>
              <p className="mt-1 text-[8px] text-muted-foreground">Invested ₹13.5 L</p>
            </Card>

            <Card k="summary" active={active} onActive={setActive} z={88} x={176} y={152} w={136} h={96} delay={1.2}>
              <Tag>This month</Tag>
              <dl className="mt-1 space-y-1 text-[9px]" aria-hidden>
                {[['Income', '₹1.4 L', 'text-success'], ['Spent', '₹42 K', 'text-foreground'], ['Saved', '₹98 K', 'text-success']].map(([k, v, t]) => (
                  <div key={k} className="flex items-center justify-between"><dt className="text-muted-foreground">{k}</dt><dd className={cn('font-mono font-semibold tabular-nums', t)}>{v}</dd></div>
                ))}
              </dl>
            </Card>
          </div>
        </div>
      </div>

      <figcaption className="mx-auto mt-2 max-w-[460px]">
        <div className="flex flex-wrap justify-center gap-1.5">
          {PARTS.map((p) => (
            <button key={p.key} type="button" aria-pressed={active === p.key} onMouseEnter={() => setActive(p.key)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(p.key)} onBlur={() => setActive(null)}
              className={cn('rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', active === p.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted')}>{p.label}</button>
          ))}
        </div>
        <p className="mt-2 min-h-[2.5rem] text-center text-xs text-muted-foreground">{shown ? shown.note : 'Sample figures. Hover a card, or pick a part, to see what it shows.'}</p>
      </figcaption>
    </figure>
  )
}
