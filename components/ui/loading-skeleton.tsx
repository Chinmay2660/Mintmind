'use client'

import { cn } from '@/lib/utils'

interface PageSkeletonProps {
  className?: string
}

export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('p-4 md:p-6 space-y-4', className)}>
      <div className="skeleton h-8 w-1/3" />
      <div className="surface-card h-32 animate-pulse" />
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
        <div key={i} className="surface-card h-24 animate-pulse" />
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
        <div key={i} className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="skeleton-icon w-12 h-12" />
            <div className="skeleton w-16 h-16 rounded-full" />
          </div>
          <div className="skeleton h-4 w-24 mb-2" />
          <div className="skeleton h-8 w-32" />
        </div>
      ))}
    </div>
  )
}
