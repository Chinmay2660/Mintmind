'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
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
  icon?: LucideIcon
  gradient?: string
  bgColor?: string
  iconColor?: string
  formatValue?: (value: string | number) => string | number
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
}: StatCardProps) {
  const formattedValue = formatValue ? formatValue(value) : value

  return (
    <Card className={cn('relative overflow-hidden p-5', className)} animate hover {...props}>
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground leading-5">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{formattedValue}</p>
          </div>
          {Icon && (
            <div className="relative shrink-0">
              <div
                className={cn(
                  'pointer-events-none absolute -right-3 -top-3 size-16 rounded-full opacity-20 bg-gradient-to-br',
                  gradient
                )}
                aria-hidden
              />
              <div
                className={cn(
                  'relative flex size-12 items-center justify-center rounded-xl',
                  bgColor
                )}
              >
                <Icon className={cn('size-6 shrink-0', iconColor)} strokeWidth={2} aria-hidden />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
