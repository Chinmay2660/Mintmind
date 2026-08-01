'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { getDashboardPageIcon } from '@/lib/constants/dashboardNav'

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

  const handleBack = () => {
    if (backHref) router.push(backHref)
    else router.back()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between mb-6 ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="md:hidden flex-shrink-0 p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
          </button>
        )}
        {PageIcon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl liquid-pill flex items-center justify-center">
            <PageIcon className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="flex-shrink-0 ml-3">{children}</div>}
    </motion.div>
  )
}
