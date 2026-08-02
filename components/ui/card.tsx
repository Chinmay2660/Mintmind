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
}

export function Card({
  children,
  className = '',
  onClick,
  animate = true,
  delay = 0,
  hover = false,
  ...props
}: CardProps) {
  const content = (
    <div
      className={cn(
        'surface-card',
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

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5 pb-3', className)}>{children}</div>
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('p-5 pt-3 border-t border-border', className)}>
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
    <Card className={cn('relative overflow-hidden p-5', className)} animate hover {...props}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground leading-5">{title}</p>
        <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{formattedValue}</p>
      </div>
    </Card>
  )
}
