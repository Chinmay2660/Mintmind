'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { scrollPageToTop } from '@/lib/utils/scroll'

interface FilterButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  value: string
  activeValue: string
  onClick: (value: string) => void
  children: ReactNode
  icon?: LucideIcon
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function FilterButton({
  value,
  activeValue,
  onClick,
  children,
  icon: Icon,
  className = '',
  size = 'sm',
  ...props
}: FilterButtonProps) {
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

interface FilterOption {
  value: string
  label: string
  icon?: LucideIcon
}

interface FilterButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (value: string) => void
  options: FilterOption[]
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function FilterButtonGroup({
  value,
  onValueChange,
  options,
  className = '',
  size = 'sm',
  ...props
}: FilterButtonGroupProps) {
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    scrollPageToTop()
  }, [value])

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
