'use client'

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const COLS = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-2 lg:grid-cols-4' } as const

/**
 * Swipeable card row for phones (scroll-snap, peek of the next card, page dots). From tablet width up it is a plain grid,
 * so there is one set of children and no duplicated markup. The row is keyboard scrollable and dots are real buttons.
 */
export function SnapCarousel({ label, children, cols = 3, itemWidth = 'w-[78%]', className }: {
  label: string
  children: ReactNode
  cols?: 2 | 3 | 4
  /** Card width on phones; the remainder shows the next card so it is clear the row scrolls. */
  itemWidth?: string
  className?: string
}) {
  const items = Children.toArray(children).filter(Boolean)
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const frame = useRef(0)

  const onScroll = useCallback(() => {
    const el = scroller.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const kids = Array.from(el.children) as HTMLElement[]
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0, dist = Infinity
    kids.forEach((k, i) => { const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i } })
    // At the very end the last card may not reach the middle; still count it as active.
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) best = kids.length - 1
    setActive(best)
  }, [])

  useEffect(() => { onScroll() }, [onScroll, items.length])

  const go = (i: number) => {
    const el = scroller.current
    const kid = el?.children[i] as HTMLElement | undefined
    if (el && kid) el.scrollTo({ left: kid.offsetLeft - 16, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  if (items.length === 0) return null
  return (
    <div className={className}>
      <div
        ref={scroller}
        onScroll={() => { if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; onScroll() }) }}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-scrollbar]:hidden',
          'md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0 md:pb-0 [&>*]:min-w-0',
          COLS[cols]
        )}
      >
        {items.map((c, i) => (
          <div key={i} className={cn('shrink-0 snap-start md:w-auto [&>*]:h-full', itemWidth)}>{c}</div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 md:hidden">
          {items.map((_, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-label={`Show card ${i + 1} of ${items.length}`} aria-current={i === active}
              className="flex h-6 w-4 items-center justify-center outline-none">
              <span className={cn('h-1.5 rounded-full transition-all', i === active ? 'w-4 bg-primary' : 'w-1.5 bg-border')} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
