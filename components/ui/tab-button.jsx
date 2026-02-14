'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function TabButton({ 
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
      className={cn(
        'rounded-full whitespace-nowrap',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </Button>
  )
}

export function TabButtonGroup({ 
  value, 
  onValueChange, 
  options, 
  className = '',
  ...props 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn('flex gap-2 overflow-x-auto pb-2 -mx-4 px-4', className)}
      {...props}
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

