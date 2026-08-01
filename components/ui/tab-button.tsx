'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TabButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  value: string
  activeValue: string
  onClick: (value: string) => void
  children: ReactNode
  icon?: LucideIcon
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function TabButton({
  value,
  activeValue,
  onClick,
  children,
  icon: Icon,
  className = '',
  size = 'sm',
  ...props
}: TabButtonProps) {
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

interface TabOption {
  value: string
  label: string
  icon?: LucideIcon
}

interface TabButtonGroupProps {
  value: string
  onValueChange: (value: string) => void
  options: TabOption[]
  className?: string
}

export function TabButtonGroup({
  value,
  onValueChange,
  options,
  className = '',
}: TabButtonGroupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn('flex gap-2 overflow-x-auto pb-2 -mx-4 px-4', className)}
    >
      {options.map((option) => (
        <TabButton
          key={option.value}
          value={option.value}
          activeValue={value}
          onClick={onValueChange}
          icon={option.icon}
        >
          {option.label}
        </TabButton>
      ))}
    </motion.div>
  )
}
