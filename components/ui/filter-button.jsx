'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FilterButton({ 
  value, 
  activeValue, 
  onClick, 
  children, 
  icon: Icon,
  className = '',
  size = 'sm',
  ...props 
}) {
  const isActive = value === activeValue

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      onClick={() => onClick(value)}
      size={size}
      className={cn('rounded-full whitespace-nowrap', className)}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </Button>
  )
}

export function FilterButtonGroup({ 
  value, 
  onValueChange, 
  options, 
  className = '',
  size = 'sm',
  ...props 
}) {
  return (
    <div className={cn('flex gap-2 flex-wrap', className)} {...props}>
      {options.map((option) => (
        <FilterButton
          key={option.value}
          value={option.value}
          activeValue={value}
          onClick={onValueChange}
          icon={option.icon}
          size={size}
        >
          {option.label}
        </FilterButton>
      ))}
    </div>
  )
}

