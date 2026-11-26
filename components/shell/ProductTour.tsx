'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWealth } from '@/lib/wealth/WealthContext'

export const START_TOUR_EVENT = 'mm:start-tour'

interface Step { title: string; body: string; selector: string }

// Each step points at something already on screen. If it is not visible (a small screen, a hidden section), the step shows centred instead.
const STEPS: Step[] = [
  { title: 'Net worth overview', body: 'Your net worth is the difference between everything you own and everything you owe. It updates as you add accounts, funds and loans.', selector: 'section[aria-label^="Net worth"]' },
  { title: 'Assets and liabilities', body: 'See how your wealth is spread across categories, and what you owe, in one place. Tap a card to open the details.', selector: 'a[href="/dashboard/net-worth"]' },
  { title: 'Investment portfolio', body: 'Mutual funds, SIPs and returns live here. Returns are worked out from the units and dates you recorded.', selector: 'a[href="/dashboard/mutual-funds"]' },
  { title: 'Transactions', body: 'Record spending, income and transfers. Each one updates the balance of the account or card it touches.', selector: 'a[href="/dashboard/budget"]' },
  { title: 'Financial goals', body: 'Link accounts and funds to a goal and track progress towards it. Nothing is moved, goals only read your balances.', selector: 'a[href="/dashboard/net-worth"]' },
  { title: 'Quick add', body: 'The Add button records a transaction or an account without leaving the page. Press A for a transaction and N for an asset.', selector: 'button[aria-label="Quick actions"]' },
  { title: 'Search', body: 'Find any page or action in a few keystrokes. Press / or Ctrl K from anywhere.', selector: 'button[aria-label="Search"]' },
  { title: 'Reports and analytics', body: 'Ask My Wealth AI in plain language, check your health score, or export a summary report.', selector: 'a[href="/dashboard/ai"]' },
]

const visibleRect = (sel: string): DOMRect | null => {
  const el = document.querySelector(sel) as HTMLElement | null
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight ? r : null
}

/** A short guided tour. Starts once for a new real profile, can be restarted from Settings, and never blocks the app. */
export function ProductTour() {
  const { ready, db, data, isDemo } = useWealth() as any
  const pathname = usePathname()
  const [step, setStep] = useState<number | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const done = data.meta.find((m: any) => m.key === 'tourDone')?.value

  const finish = useCallback(async () => {
    setStep(null)
    try { await db?.meta.put({ key: 'tourDone', value: true }) } catch { /* the tour will simply offer itself again */ }
  }, [db])

  useEffect(() => { const h = () => setStep(0); window.addEventListener(START_TOUR_EVENT, h); return () => window.removeEventListener(START_TOUR_EVENT, h) }, [])

  // first visit for a real profile: start on the dashboard after the page has settled
  useEffect(() => {
    if (!ready || isDemo || done || pathname !== '/dashboard') return
    const t = setTimeout(() => setStep((s) => (s === null ? 0 : s)), 1200)
    return () => clearTimeout(t)
  }, [ready, isDemo, done, pathname])

  useLayoutEffect(() => {
    if (step === null) return
    const place = () => setRect(visibleRect(STEPS[step].selector))
    const el = document.querySelector(STEPS[step].selector) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
    place()
    window.addEventListener('resize', place)
    const main = document.getElementById('dashboard-main-scroll')
    main?.addEventListener('scroll', place, { passive: true })
    return () => { window.removeEventListener('resize', place); main?.removeEventListener('scroll', place) }
  }, [step])

  useEffect(() => {
    if (step === null) return
    cardRef.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') setStep((s) => (s === null ? s : Math.min(STEPS.length - 1, s + 1)))
      else if (e.key === 'ArrowLeft') setStep((s) => (s === null ? s : Math.max(0, s - 1)))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [step, finish])

  if (step === null) return null
  const s = STEPS[step]
  const last = step === STEPS.length - 1
  const pad = 6
  const W = 320
  let style: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: `min(${W}px, calc(100vw - 2rem))` }
  if (rect) {
    const below = rect.bottom + 14 + 190 < window.innerHeight
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - W - 12)
    style = { left, top: below ? rect.bottom + 14 : Math.max(12, rect.top - 14 - 190), width: `min(${W}px, calc(100vw - 2rem))` }
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="absolute inset-0" onClick={finish} aria-hidden />
      {rect
        ? <div className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-200 motion-reduce:transition-none" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px hsl(var(--foreground) / 0.55)' }} />
        : <div className="pointer-events-none absolute inset-0 bg-foreground/55" />}
      <div ref={cardRef} tabIndex={-1} className="absolute rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-elevated outline-none" style={style}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
            <h3 className="mt-0.5 text-base font-semibold">{s.title}</h3>
          </div>
          <button type="button" onClick={finish} aria-label="Skip tour" className="-mr-1 -mt-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1" aria-hidden>{STEPS.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === step ? 'bg-primary' : 'bg-border'}`} />)}</div>
          <div className="flex items-center gap-2">
            {step === 0 ? <Button type="button" variant="ghost" size="sm" onClick={finish}>Skip tour</Button> : <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Previous</Button>}
            {last ? <Button type="button" size="sm" onClick={finish}>Finish tour</Button> : <Button type="button" size="sm" onClick={() => setStep(step + 1)}>Next<ArrowRight className="ml-1 h-4 w-4" /></Button>}
          </div>
        </div>
      </div>
    </div>
  )
}
