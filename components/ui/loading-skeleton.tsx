'use client'

import { cn } from '@/lib/utils'

interface PageSkeletonProps {
  className?: string
}

export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('p-4 md:p-6 animate-pulse space-y-4', className)}>
      <div className="h-8 bg-primary/20 dark:bg-primary/30 rounded w-1/3" />
      <div className="h-32 bg-primary/20 dark:bg-primary/30 rounded-2xl" />
    </div>
  )
}

interface ListItemSkeletonProps {
  count?: number
  className?: string
}

export function ListItemSkeleton({ count = 3, className }: ListItemSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-24 bg-primary/20 dark:bg-primary/30 rounded-2xl animate-pulse"
        />
      ))}
    </div>
  )
}

interface CardGridSkeletonProps {
  count?: number
  className?: string
}

export function CardGridSkeleton({ count = 4, className }: CardGridSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="surface-card p-5 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 dark:bg-primary/30" />
            <div className="w-16 h-16 rounded-full bg-primary/20 dark:bg-primary/30" />
          </div>
          <div className="h-4 bg-primary/20 dark:bg-primary/30 rounded w-24 mb-2" />
          <div className="h-8 bg-primary/20 dark:bg-primary/30 rounded w-32" />
        </div>
      ))}
    </div>
  )
}
