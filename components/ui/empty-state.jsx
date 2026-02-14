'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = '' 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800', className)}
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {Icon && <Icon className="w-8 h-8 text-gray-400" />}
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">{title}</p>
      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{description}</p>
      )}
      {onAction && actionLabel && (
        <Button
          onClick={onAction}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}

