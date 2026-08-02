'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { getDashboardPageIcon } from '@/lib/constants/dashboardNav'
import { isFromHome } from '@/lib/utils/navigation'
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

export function PageHeader({ title, subtitle, icon, children, className = '', showBack, backHref }: PageHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const PageIcon = icon ?? getDashboardPageIcon(pathname)
  const [fromHome, setFromHome] = useState(false)

  useEffect(() => {
    setFromHome(isFromHome())
  }, [pathname])

  const handleBack = () => {
    if (fromHome) {
      router.push('/dashboard')
      return
    }
    if (backHref) router.push(backHref)
    else router.back()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'mb-6',
        children && 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {(showBack || fromHome) && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-shrink-0 flex items-center gap-0.5 p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Back</span>
          </button>
        )}
        {PageIcon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <PageIcon className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 justify-end sm:ml-3">{children}</div>
      )}
    </motion.div>
  )
}
