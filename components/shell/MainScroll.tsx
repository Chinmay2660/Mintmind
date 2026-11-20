'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The dashboard's scroll area. On desktop the floating Add and Wealth AI buttons sit over the bottom right corner, so a page
 * that really scrolls gets extra room at the end. A page that already fits gets none, so no scrollbar appears for nothing.
 */
export function MainScroll({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [pad, setPad] = useState(false)
  const [fabsShown, setFabsShown] = useState(true)
  const revealFabs = useRef<() => void>(() => {})

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

  // Phone: the floating Add and Wealth AI buttons stay out of the way. They show briefly on arrival, come back when you scroll
  // up or tap the edge tab, and slide away again after a few idle seconds, on scrolling down, or while the keyboard is open.
  useEffect(() => {
    const o = outer.current
    if (!o) return
    const mq = window.matchMedia('(max-width: 767px)')
    const root = document.documentElement
    let timer: ReturnType<typeof setTimeout> | undefined
    const hide = () => { clearTimeout(timer); root.setAttribute('data-fab-hidden', 'true'); setFabsShown(false) }
    const show = (ms = 4000) => {
      if (!mq.matches || root.hasAttribute('data-kb-open')) return
      root.removeAttribute('data-fab-hidden'); setFabsShown(true)
      clearTimeout(timer); timer = setTimeout(hide, ms)
    }
    revealFabs.current = () => show(5000)
    if (mq.matches) { show(2500) }
    let last = o.scrollTop
    const onScroll = () => {
      if (!mq.matches) return
      const y = o.scrollTop
      if (y - last > 10) hide()
      else if (last - y > 10 && y > 40) show()
      last = y
    }
    const field = (t: EventTarget | null) => t instanceof HTMLElement && t.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select, [contenteditable="true"]')
    const onFocusIn = (e: FocusEvent) => { if (mq.matches && field(e.target)) { root.setAttribute('data-kb-open', 'true'); hide() } }
    const onFocusOut = () => { root.removeAttribute('data-kb-open') }
    o.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      clearTimeout(timer)
      o.removeEventListener('scroll', onScroll)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      root.removeAttribute('data-fab-hidden'); root.removeAttribute('data-kb-open')
    }
  }, [])

  return (
    <>
    {/* a small edge tab: the always-there way to bring the buttons back */}
    <button type="button" onClick={() => revealFabs.current()} aria-label="Show Add and Wealth AI buttons" aria-hidden={fabsShown} tabIndex={fabsShown ? -1 : 0}
      className={cn('fixed right-0 z-30 flex h-14 w-5 items-center justify-center rounded-l-full border border-r-0 border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-opacity bottom-[calc(var(--mobile-tab-bar-height)+var(--mobile-safe-bottom)+1.25rem)] md:hidden print:hidden', fabsShown && 'pointer-events-none opacity-0')}>
      <ChevronLeft className="h-4 w-4" aria-hidden />
    </button>
    <main ref={outer} id="dashboard-main-scroll" tabIndex={-1} className={cn('app-main outline-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain mobile-content-pb md:pb-0', pad && 'md:pb-28')}>
      <div ref={inner} className="mx-auto w-full max-w-[88rem] space-y-5 px-4 py-5 md:px-6 lg:px-8">{children}</div>
    </main>
    </>
  )
}
