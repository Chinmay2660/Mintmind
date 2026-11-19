'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The dashboard's scroll area. On desktop the floating Add and Wealth AI buttons sit over the bottom right corner, so a page
 * that really scrolls gets extra room at the end. A page that already fits gets none, so no scrollbar appears for nothing.
 */
export function MainScroll({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [pad, setPad] = useState(false)

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

  return (
    <main ref={outer} id="dashboard-main-scroll" tabIndex={-1} className={cn('app-main outline-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain mobile-content-pb md:pb-0', pad && 'md:pb-28')}>
      <div ref={inner} className="mx-auto w-full max-w-[88rem] space-y-5 px-4 py-5 md:px-6 lg:px-8">{children}</div>
    </main>
  )
}
