'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ToggleButton({ 
  value, 
  activeValue, 
  onClick, 
  children, 
  className = '',
  ...props 
}) {
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

export function ToggleButtonGroup({ 
  value, 
  onValueChange, 
  options, 
  className = '',
  ...props 
}) {
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

