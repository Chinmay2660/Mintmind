'use client'

import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'

interface SwipeableRowProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

export function SwipeableRow({ children, onEdit, onDelete, className = '' }: SwipeableRowProps) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(0)
  const actionWidth = (onEdit ? 64 : 0) + (onDelete ? 64 : 0)

  if (!onEdit && !onDelete) {
    return <div className={className}>{children}</div>
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = startX.current - e.touches[0].clientX
    if (diff > 0) {
      setOffset(Math.min(diff, actionWidth))
    } else if (offset > 0) {
      setOffset(Math.max(0, offset + diff))
    }
  }

  const handleTouchEnd = () => {
    setOffset(offset > actionWidth / 2 ? actionWidth : 0)
  }

  const close = () => setOffset(0)

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div className="absolute inset-y-0 right-0 flex md:hidden">
        {onEdit && (
          <button
            type="button"
            onClick={() => { close(); onEdit() }}
            className="w-16 bg-blue-500 flex items-center justify-center"
            aria-label="Edit"
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => { close(); onDelete() }}
            className="w-16 bg-red-500 flex items-center justify-center"
            aria-label="Delete"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
      <div
        className="relative bg-inherit transition-transform duration-200 md:!translate-x-0"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

export function DesktopRowActions({ children }: { children: ReactNode }) {
  return <div className="hidden md:flex gap-1 flex-shrink-0">{children}</div>
}
