'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface QuickTile { key: string; label: string; icon: LucideIcon; href?: string; onClick?: () => void; /** the main action: filled instead of outlined */ primary?: boolean; /** pinned to the right end of the row, apart from the others */ end?: boolean }

/**
 * A row of shortcuts. On a phone it is a swipeable strip of icon tiles with the label underneath (the pattern used by the
 * Explore tabs of investing apps): the next tile peeks in from the edge so it is clear the row scrolls. From tablet width up
 * it is the usual row of small outline buttons.
 */
export function QuickTiles({ label, items, className }: { label: string; items: QuickTile[]; className?: string }) {
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
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, items.length])

  const tile = (t: QuickTile) => {
    const Icon = t.icon
    const inner = (
      <>
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-colors', t.primary ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-primary group-active:bg-muted')}><Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden /></span>
        <span className="line-clamp-2 min-h-[2.1em] w-full text-center text-xs font-medium leading-tight text-foreground">{t.label}</span>
      </>
    )
    const cls = cn('group flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring')
    return t.href
      ? <Link key={t.key} href={t.href} className={cls}>{inner}</Link>
      : <button key={t.key} type="button" onClick={t.onClick} className={cls}>{inner}</button>
  }

  return (
    <>
      <div className={cn('relative -mx-4 md:hidden', className)}>
        <div ref={row} role="group" aria-label={label} onScroll={measure} className="flex snap-x justify-between gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(tile)}
        </div>
        {edge.left && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />}
        {edge.right && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />}
      </div>
      <div className="hidden flex-wrap items-center gap-2 md:flex" role="group" aria-label={label}>
        {items.map((t) => {
          const Icon = t.icon
          return t.href
            ? <Button key={t.key} variant={t.primary ? 'default' : 'outline'} size="sm" asChild className={t.end ? 'ml-auto' : undefined}><Link href={t.href}><Icon className="mr-1.5 h-4 w-4" aria-hidden />{t.label}</Link></Button>
            : <Button key={t.key} variant={t.primary ? 'default' : 'outline'} size="sm" onClick={t.onClick} className={t.end ? 'ml-auto' : undefined}><Icon className="mr-1.5 h-4 w-4" aria-hidden />{t.label}</Button>
        })}
      </div>
    </>
  )
}
