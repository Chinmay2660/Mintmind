'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { scrollActiveTabIntoView, scrollPageToTop } from '@/lib/utils/scroll'

const tabScrollClassName =
  'flex gap-2 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ value, children, className = '' }: TabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      scrollActiveTabIntoView(scrollRef.current)
      return
    }
    scrollPageToTop()
    scrollActiveTabIntoView(scrollRef.current)
  }, [value])

  return (
    <div className="-mx-4 overflow-hidden">
      <div
        ref={scrollRef}
        className={cn(
          tabScrollClassName,
          'border-b border-gray-200 dark:border-gray-800',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

interface TabProps {
  value: string
  activeValue: string
  onValueChange: (value: string) => void
  icon?: LucideIcon
  children: ReactNode
  className?: string
}

export function Tab({ value, activeValue, onValueChange, icon: Icon, children, className = '' }: TabProps) {
  const isActive = value === activeValue

  return (
    <button
      type="button"
      data-active={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        'shrink-0 px-4 py-2 font-medium transition-colors relative',
        isActive
          ? 'text-primary border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground dark:hover:text-gray-300',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {children}
      </div>
    </button>
  )
}
