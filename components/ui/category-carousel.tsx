'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CategoryItem { key: string; label: string; icon: LucideIcon; count?: number }

/**
 * Pick one category at a time. On a phone: a swipeable strip of icon tiles with the name underneath and the selected one filled,
 * the next tile peeking in from the edge. From tablet width up: a row of pills with the icon, name and count. There is no "All":
 * exactly one category is always selected. Arrow keys move between them.
 */
export function CategoryCarousel({ label, items, value, onChange, className }: { label: string; items: CategoryItem[]; value: string; onChange: (key: string) => void; className?: string }) {
  const row = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const el = row.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setEdge((e) => (e.left === left && e.right === right ? e : { left, right }))
  }, [])

  useEffect(() => {
    const el = row.current
    const on = el?.querySelector<HTMLElement>('[aria-selected="true"]')
    // scroll this row only, sideways, so the page itself never jumps
    if (el && on) el.scrollTo({ left: on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [value, items.length, measure])

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = Math.max(0, items.findIndex((t) => t.key === value))
    const next = items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length]
    e.preventDefault()
    onChange(next.key)
    requestAnimationFrame(() => row.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
  }

  return (
    <>
      <div className={cn('relative -mx-4 md:hidden', className)}>
        <div ref={row} role="tablist" aria-label={label} onScroll={measure} onKeyDown={onKey} className="flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((t) => {
            const on = t.key === value
            const Icon = t.icon
            return (
              <button key={t.key} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(t.key)}
                className="group flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className={cn('relative flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-primary group-active:bg-muted')}>
                  <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
                  {t.count != null && <span className={cn('absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full border px-1 text-center text-[11px] font-semibold leading-[1.1rem] tabular-nums', on ? 'border-primary bg-background text-foreground' : 'border-border bg-muted text-muted-foreground')}>{t.count}</span>}
                </span>
                <span className={cn('line-clamp-2 min-h-[2.1em] w-full text-center text-xs leading-tight', on ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground')}>{t.label}</span>
              </button>
            )
          })}
        </div>
        {edge.left && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />}
        {edge.right && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />}
      </div>

      <div role="tablist" aria-label={label} onKeyDown={onKey} className="hidden flex-wrap gap-2 md:flex">
        {items.map((t) => {
          const on = t.key === value
          const Icon = t.icon
          return (
            <button key={t.key} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(t.key)}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
              <Icon className="h-4 w-4" aria-hidden />{t.label}{t.count != null && <span className={cn('text-xs tabular-nums', on ? 'opacity-80' : 'text-muted-foreground')}>{t.count}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}
