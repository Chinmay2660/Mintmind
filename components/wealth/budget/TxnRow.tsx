'use client'

import { useRef, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import { Money } from '../Money'
import { cn } from '@/lib/utils'
import { categoryIcon } from './categoryIcon'

type Kind = 'expense' | 'income' | 'transfer'

const PILL: Record<Kind, { label: string; icon: typeof ArrowUpRight; cls: string; sign: string }> = {
  income: { label: 'Income', icon: ArrowDownLeft, cls: 'bg-highlight/30 text-[hsl(85_60%_22%)] dark:bg-highlight/20 dark:text-highlight', sign: '+' },
  expense: { label: 'Expense', icon: ArrowUpRight, cls: 'bg-muted text-muted-foreground', sign: '-' },
  transfer: { label: 'Transfer', icon: ArrowLeftRight, cls: 'border border-border text-muted-foreground', sign: '' },
}

/**
 * One transaction line. The type is shown by an icon, a sign and a labelled pill (never by text colour alone),
 * and the amount stays in the normal text colour so it is always readable.
 * `leading` holds a selection checkbox; `onLongPress` lets a touch user start selecting.
 */
export function TxnRow({ kind, title, category, meta, amount, actions, leading, selected, onLongPress, onSwipeLeft, onSwipeRight }: {
  kind: Kind; title: string; category: string; meta: string; amount: number
  actions?: ReactNode; leading?: ReactNode; selected?: boolean; onLongPress?: () => void
  /** Touch screens: drag the row left or right past about 80px to run it. Left is for removing, right for editing. */
  onSwipeLeft?: { label: string; run: () => void }; onSwipeRight?: { label: string; run: () => void }
}) {
  const Icon = categoryIcon(category)
  const p = PILL[kind]
  const PillIcon = p.icon
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = (e: React.PointerEvent) => {
    if (!onLongPress || e.pointerType === 'mouse') return
    timer.current = setTimeout(() => { timer.current = null; onLongPress() }, 480)
  }
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  const inner = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; on: boolean } | null>(null)
  const swipeable = !!(onSwipeLeft || onSwipeRight)
  const move = (e: React.TouchEvent) => {
    const d = drag.current; if (!d || !inner.current) return
    const dx = e.touches[0].clientX - d.x, dy = e.touches[0].clientY - d.y
    if (!d.on && (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.5)) return
    d.on = true; cancel()
    const allowed = dx < 0 ? !!onSwipeLeft : !!onSwipeRight
    inner.current.style.transition = 'none'
    inner.current.style.transform = `translateX(${allowed ? Math.max(-120, Math.min(120, dx)) : dx / 6}px)`
  }
  const end = (e: React.TouchEvent) => {
    const d = drag.current; drag.current = null
    if (!d || !inner.current) return
    const dx = e.changedTouches[0].clientX - d.x
    inner.current.style.transition = 'transform 180ms ease-out'; inner.current.style.transform = ''
    if (!d.on) return
    if (dx <= -80 && onSwipeLeft) onSwipeLeft.run(); else if (dx >= 80 && onSwipeRight) onSwipeRight.run()
  }
  return (
    <li onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerMove={cancel} onPointerCancel={cancel} onTouchStart={swipeable ? (e) => { drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, on: false } } : undefined} onTouchMove={swipeable ? move : undefined} onTouchEnd={swipeable ? end : undefined} onTouchCancel={swipeable ? end : undefined} data-swipe-row={swipeable ? '' : undefined} className={cn('relative overflow-hidden', leading && '-mx-4')}>
      {swipeable && <>
        {onSwipeRight && <span aria-hidden className="absolute inset-y-0 left-0 flex w-full items-center bg-primary/25 pl-4 text-xs font-bold">{onSwipeRight.label}</span>}
        {onSwipeLeft && <span aria-hidden className="absolute inset-y-0 right-0 flex w-full items-center justify-end bg-destructive/25 pr-4 text-xs font-bold">{onSwipeLeft.label}</span>}
      </>}
      <div ref={inner} style={swipeable ? { touchAction: 'pan-y' } : undefined} className={cn('cv-auto flex items-center gap-3 py-3 transition-colors', leading && 'px-4', selected && 'bg-primary/15 shadow-[inset_3px_0_0_0_hsl(var(--primary))]', swipeable && 'relative bg-card')}>
        {leading && <span className="flex h-10 w-6 shrink-0 items-center justify-center">{leading}</span>}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden><Icon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{meta}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums">{p.sign}<Money value={Math.abs(amount)} /></span>
          <span className={cn('mt-0.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium', p.cls)}><PillIcon className="h-3 w-3" aria-hidden />{p.label}</span>
        </span>
        {actions && <span className="flex shrink-0 items-center">{actions}</span>}
      </div>
    </li>
  )
}
