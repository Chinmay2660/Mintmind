'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TabItem { key: string; label: string; icon?: LucideIcon; badge?: number }

/**
 * The one tab row used by every page. Two or three tabs share the width evenly on phones; longer rows scroll sideways
 * with the active tab kept in view and a fade on the edge that has more. Arrow keys move between tabs.
 */
export function TabBar({ label, tabs, value, onChange, className }: { label: string; tabs: TabItem[]; value: string; onChange: (key: string) => void; className?: string }) {
  const row = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })
  const frame = useRef(0)

  const measure = () => {
    const el = row.current
    if (!el) return
    const left = el.scrollLeft > 4, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setEdge((e) => (e.left === left && e.right === right ? e : { left, right }))
  }
  useEffect(() => {
    const el = row.current
    // Scroll only this row, sideways. scrollIntoView could also move the whole page up or down.
    const tab = el?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (el && tab) el.scrollTo({ left: tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [value, tabs.length])

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = tabs.findIndex((t) => t.key === value)
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]
    e.preventDefault()
    onChange(next.key)
    requestAnimationFrame(() => row.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
  }

  const even = tabs.length <= 3
  return (
    <div className={cn('relative -mx-4 border-b border-border md:mx-0', className)}>
      <div
        ref={row}
        role="tablist"
        aria-label={label}
        onScroll={() => { if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; measure() }) }}
        onKeyDown={onKey}
        className={cn('flex overflow-x-auto px-4 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden', even ? 'gap-1' : 'snap-x gap-1')}
      >
        {tabs.map((t) => {
          const on = t.key === value
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.key)}
              className={cn(
                'relative flex min-h-11 shrink-0 snap-start items-center justify-center gap-2 whitespace-nowrap px-3.5 text-sm font-medium outline-none transition-colors focus-visible:bg-muted',
                even && 'max-md:flex-1',
                on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden />}
              {t.label}
              {t.badge ? <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold leading-5 text-primary" aria-label={`${t.badge} waiting`}>{t.badge}</span> : null}
              <span aria-hidden className={cn('absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors', on ? 'bg-primary' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>
      {edge.left && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-background/90 md:hidden" />}
      {edge.right && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-background/90 md:hidden" />}
    </div>
  )
}
