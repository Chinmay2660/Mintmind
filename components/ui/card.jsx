'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function Card({ 
  children, 
  className = '', 
  onClick,
  animate = true,
  delay = 0,
  hover = false,
  ...props 
}) {
  const content = (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800',
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform',
        hover && 'hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
      >
        {content}
      </motion.div>
    )
  }

  return content
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={cn('p-5 pb-3', className)}>
      {children}
    </div>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={cn('p-5', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={cn('p-5 pt-3 border-t border-gray-100 dark:border-gray-800', className)}>
      {children}
    </div>
  )
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient = 'from-primary to-primary/80',
  bgColor = 'bg-primary/10',
  iconColor = 'text-primary',
  className = '',
  formatValue,
  ...props 
}) {
  const formattedValue = formatValue ? formatValue(value) : value

  return (
    <Card
      className={cn('relative overflow-hidden', className)}
      animate={true}
      hover={true}
      {...props}
    >
      <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16', `bg-gradient-to-br ${gradient} opacity-10`)}></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <p className={cn('text-sm font-medium', 'text-gray-600 dark:text-gray-400')}>
            {title}
          </p>
          {Icon && (
            <div className={cn('p-2 rounded-lg', bgColor)}>
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
          )}
        </div>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          {formattedValue}
        </p>
      </div>
    </Card>
  )
}

