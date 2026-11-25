'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The dashboard's scroll area. On desktop the floating Add and Wealth AI buttons sit over the bottom right corner, so a page
 * that really scrolls gets extra room at the end. A page that already fits gets none, so no scrollbar appears for nothing.
 */
export function MainScroll({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [pad, setPad] = useState(false)
  const [userHidden, setUserHidden] = useState(false)

  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const check = () => setPad(i.offsetHeight > o.clientHeight)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(o)
    ro.observe(i)
    return () => ro.disconnect()
  }, [])

  // Phone: the floating Add and Wealth AI buttons are always visible. They go away only when you tap the edge tab (remembered),
  // or while the keyboard is open so they never cover what you type.
  useEffect(() => {
    try { if (localStorage.getItem('mm-fab-hidden') === '1') setUserHidden(true) } catch {}
  }, [])
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => {
      if (mq.matches && (userHidden || root.hasAttribute('data-kb-open'))) root.setAttribute('data-fab-hidden', 'true')
      else root.removeAttribute('data-fab-hidden')
    }
    apply()
    const field = (t: EventTarget | null) => t instanceof HTMLElement && t.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select, [contenteditable="true"]')
    const onFocusIn = (e: FocusEvent) => { if (mq.matches && field(e.target)) { root.setAttribute('data-kb-open', 'true'); apply() } }
    const onFocusOut = () => { root.removeAttribute('data-kb-open'); apply() }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    mq.addEventListener('change', apply)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      mq.removeEventListener('change', apply)
      root.removeAttribute('data-fab-hidden'); root.removeAttribute('data-kb-open')
    }
  }, [userHidden])
  const toggle = () => setUserHidden(v => { const n = !v; try { localStorage.setItem('mm-fab-hidden', n ? '1' : '0') } catch {} return n })

  return (
    <>
    {/* a small edge tab: hides the floating buttons, or brings them back */}
    <button type="button" onClick={toggle} aria-label={userHidden ? 'Show Add and Wealth AI buttons' : 'Hide Add and Wealth AI buttons'}
      className="fixed right-0 z-30 flex h-12 w-6 items-center justify-center rounded-l-full border border-r-0 border-primary/60 bg-primary text-primary-foreground shadow-md bottom-[calc(var(--mobile-tab-bar-height)+var(--mobile-safe-bottom)+12rem)] md:hidden print:hidden [[data-kb-open]_&]:hidden">
      {userHidden ? <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden /> : <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden />}
    </button>
    <main ref={outer} id="dashboard-main-scroll" tabIndex={-1} className={cn('app-main outline-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain mobile-content-pb md:pb-0', pad && 'md:pb-28')}>
      <div ref={inner} className="mx-auto w-full max-w-[88rem] min-[2200px]:max-w-[120rem] space-y-5 px-4 py-5 md:px-6 lg:px-8">{children}</div>
    </main>
    </>
  )
}
