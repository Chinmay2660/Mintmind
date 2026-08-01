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
        'text-center py-16 surface-card',
        className
      )}
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full liquid-pill flex items-center justify-center">
        {Icon && <Icon className="w-8 h-8 text-primary" />}
      </div>
      <p className="text-muted-foreground mb-2 font-medium">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground/80 mb-4">{description}</p>
      )}
      {onAction && actionLabel && (
        <Button onClick={onAction} className="liquid-btn border-0 text-white">
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}
