'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-primary/15 bg-primary/10 text-primary',
  success: 'border-success/15 bg-success/10 text-success',
  warning: 'border-warning/15 bg-warning/10 text-warning',
  danger: 'border-destructive/15 bg-destructive/10 text-destructive',
  muted: 'border-border/60 bg-muted/40 text-muted-foreground',
  outline: 'border-border bg-transparent text-foreground',
}

export function Badge({
  children,
  variant = 'default',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
