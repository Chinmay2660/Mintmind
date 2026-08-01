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
    <div className={cn('flex gap-2', className)} {...props}>
      {options.map((option) => (
        <ToggleButton
          key={option.value}
          value={option.value}
          activeValue={value}
          onClick={onValueChange}
        >
          {option.label}
        </ToggleButton>
      ))}
    </div>
  )
}
