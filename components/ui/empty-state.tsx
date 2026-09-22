'use client'

import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'text-center py-14 px-6 surface-card',
        className
      )}
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center">
        {Icon && <Icon className="w-7 h-7 text-primary" strokeWidth={1.75} />}
      </div>
      <p className="text-foreground mb-1.5 font-semibold">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">{description}</p>
      )}
      {onAction && actionLabel && (
        <Button onClick={onAction}>
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}
