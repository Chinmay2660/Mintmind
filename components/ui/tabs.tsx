'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ children, className = '' }: TabsProps) {
  return (
    <div className={cn('flex gap-2 border-b border-gray-200 dark:border-gray-800', className)}>
      {children}
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
      onClick={() => onValueChange(value)}
      className={cn(
        'px-4 py-2 font-medium transition-colors relative',
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
