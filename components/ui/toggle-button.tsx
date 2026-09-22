'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ToggleButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  value: string
  activeValue: string
  onClick: (value: string) => void
  children: ReactNode
  className?: string
}

export function ToggleButton({
  value,
  activeValue,
  onClick,
  children,
  className = '',
  ...props
}: ToggleButtonProps) {
  const isActive = value === activeValue

  return (
    <Button
      type="button"
      variant={isActive ? 'default' : 'outline'}
      onClick={() => onClick(value)}
      className={cn('flex-1', className)}
      {...props}
    >
      {children}
    </Button>
  )
}

interface ToggleOption {
  value: string
  label: string
}

interface ToggleButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (value: string) => void
  options: ToggleOption[]
  className?: string
}

export function ToggleButtonGroup({
  value,
  onValueChange,
  options,
  className = '',
  ...props
}: ToggleButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex w-full rounded-[var(--radius-lg)] border border-border/70 bg-muted/25 p-1',
        className
      )}
      role="group"
      {...props}
    >
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
