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
export function TxnRow({ kind, title, category, meta, amount, actions, leading, selected, onLongPress }: {
  kind: Kind; title: string; category: string; meta: string; amount: number
  actions?: ReactNode; leading?: ReactNode; selected?: boolean; onLongPress?: () => void
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
  return (
    <li onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerMove={cancel} onPointerCancel={cancel}
      className={cn('flex items-center gap-3 py-3 transition-colors', selected && 'bg-primary/10')}>
      {leading}
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
    </li>
  )
}
