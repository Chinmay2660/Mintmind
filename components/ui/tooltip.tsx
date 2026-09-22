'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type TooltipSide = 'right' | 'left' | 'top' | 'bottom'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: TooltipSide
  className?: string
  disabled?: boolean
}

const GAP = 10

function getTooltipPosition(rect: DOMRect, side: TooltipSide) {
  switch (side) {
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + GAP }
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - GAP }
    case 'bottom':
      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2 }
    case 'top':
      return { top: rect.top - GAP, left: rect.left + rect.width / 2 }
  }
}

const sideTransform: Record<TooltipSide, string> = {
  right: '-translate-y-1/2',
  left: '-translate-x-full -translate-y-1/2',
  bottom: '-translate-x-1/2',
  top: '-translate-x-1/2 -translate-y-full',
}

export function Tooltip({
  content,
  children,
  side = 'right',
  className,
  disabled = false,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    setCoords(getTooltipPosition(el.getBoundingClientRect(), side))
    setVisible(true)
  }, [side])

  const hide = useCallback(() => {
    setVisible(false)
  }, [])

  if (disabled) {
    return <>{children}</>
  }

  const tooltip =
    visible && typeof document !== 'undefined'
      ? createPortal(
          <span
            style={{ top: coords.top, left: coords.left }}
            className={cn(
              'pointer-events-none fixed z-[200] whitespace-nowrap rounded-[var(--radius-lg)] border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-elevated',
              sideTransform[side]
            )}
          >
            {content}
          </span>,
          document.body
        )
      : null

  return (
    <>
      <span
        ref={triggerRef}
        className={cn('inline-flex', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </span>
      {tooltip}
    </>
  )
}
