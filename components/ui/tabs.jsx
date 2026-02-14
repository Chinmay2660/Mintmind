'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <div className={cn('flex gap-2 border-b border-gray-200 dark:border-gray-800', className)}>
      {children}
    </div>
  )
}

export function Tab({ value, activeValue, onValueChange, icon: Icon, children, className = '' }) {
  const isActive = value === activeValue

  return (
    <button
      onClick={() => onValueChange(value)}
      className={cn(
        'px-4 py-2 font-medium transition-colors relative',
        isActive
          ? 'text-primary border-b-2 border-primary'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
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

