'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  animate?: boolean
  delay?: number
  hover?: boolean
  elevated?: boolean
}

export function Card({
  children,
  className = '',
  onClick,
  animate = true,
  delay = 0,
  hover = false,
  elevated = false,
  ...props
}: CardProps) {
  const content = (
    <div
      className={cn(
        elevated ? 'surface-card-elevated' : 'surface-card',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform',
        hover && 'md:hover:border-primary/20 md:hover:shadow-elevated transition-shadow',
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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.35 }}
      >
        {content}
      </motion.div>
    )
  }

  return content
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 pb-2 pt-5 md:px-6 md:pt-6', className)}>{children}</div>
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 pb-5 md:px-6 md:pb-6', className)}>{children}</div>
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('border-t border-border px-5 py-4 md:px-6', className)}>
      {children}
    </div>
  )
}

interface StatCardProps extends Omit<CardProps, 'children'> {
  title: string
  value: string | number
  formatValue?: (value: string | number) => string | number
}

export function StatCard({
  title,
  value,
  className = '',
  formatValue,
  ...props
}: StatCardProps) {
  const formattedValue = formatValue ? formatValue(value) : value

  return (
    <Card className={cn('p-5 md:p-6', className)} animate hover {...props}>
      <p className="mm-stat-label">{title}</p>
      <p className="mm-stat-value mt-2">{formattedValue}</p>
    </Card>
  )
}
