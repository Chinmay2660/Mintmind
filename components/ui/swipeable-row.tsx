'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion'
import { Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

interface SwipeableRowProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

const ACTION_WIDTH = 64

export function SwipeableRow({ children, onEdit, onDelete, className = '' }: SwipeableRowProps) {
  const isMobile = useIsMobile()
  const actionWidth = (onEdit ? ACTION_WIDTH : 0) + (onDelete ? ACTION_WIDTH : 0)
  const x = useMotionValue(0)
  const actionsOpacity = useTransform(x, [-actionWidth, -16, 0], [1, 0.6, 0])
  const [isOpen, setIsOpen] = useState(false)

  if (!onEdit && !onDelete) {
    return <div className={className}>{children}</div>
  }

  const snap = (open: boolean) => {
    setIsOpen(open)
    animate(x, open ? -actionWidth : 0, {
      type: 'spring',
      stiffness: 500,
      damping: 40,
      mass: 0.8,
    })
  }

  const close = () => snap(false)

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const shouldOpen = info.offset.x < -actionWidth / 2 || info.velocity.x < -400
    snap(shouldOpen)
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      <motion.div
        className={cn(
          'absolute inset-y-0 right-0 z-0 flex md:hidden',
          !isOpen && 'pointer-events-none'
        )}
        style={{ opacity: actionsOpacity }}
        aria-hidden={!isOpen}
      >
        {onEdit && (
          <button
            type="button"
            onClick={() => {
              close()
              onEdit()
            }}
            className="w-16 bg-blue-500 flex items-center justify-center"
            aria-label="Edit"
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => {
              close()
              onDelete()
            }}
            className="w-16 bg-red-500 flex items-center justify-center rounded-r-2xl"
            aria-label="Delete"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        )}
      </motion.div>
      <motion.div
        className="relative z-10 w-full rounded-2xl bg-card touch-pan-y will-change-transform md:!translate-x-0"
        style={{ x }}
        drag={isMobile ? 'x' : false}
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragDirectionLock
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  )
}

export function DesktopRowActions({ children }: { children: ReactNode }) {
  return <div className="hidden md:flex gap-1 flex-shrink-0">{children}</div>
}
