import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardPageProps {
  children: ReactNode
  className?: string
}

/** Shared max-width, padding, and vertical rhythm for all dashboard routes. */
export function DashboardPage({ children, className }: DashboardPageProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[88rem] space-y-4 px-4 pb-4 pt-2 md:space-y-5 md:px-6 md:pb-8 md:pt-3 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  )
}
