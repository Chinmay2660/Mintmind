'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { getDashboardPageIcon } from '@/lib/constants/dashboardNav'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children?: ReactNode
  className?: string
  showBack?: boolean
  backHref?: string
}

export function PageHeader({
  title,
  subtitle,
  icon,
  children,
  className = '',
  showBack,
  backHref,
}: PageHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const PageIcon = icon ?? getDashboardPageIcon(pathname)

  const handleBack = () => {
    if (backHref) router.push(backHref)
    else router.back()
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showBack && (
          <Tooltip content="Back" side="bottom">
            <button
              type="button"
              aria-label="Back"
              onClick={handleBack}
              className="-ml-1 flex shrink-0 rounded-xl p-2 transition-colors hover:bg-muted/50"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            </button>
          </Tooltip>
        )}
        {PageIcon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
            <PageIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex shrink-0 items-center justify-end gap-2">{children}</div>
      )}
    </div>
  )
}
