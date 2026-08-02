'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { scrollActiveTabIntoView, scrollPageToTop } from '@/lib/utils/scroll'

const tabScrollClassName =
  'flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'

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
      data-active={isActive}
      className={cn('shrink-0 gap-1.5 rounded-full whitespace-nowrap', className)}
      {...props}
    >
      {Icon && <Icon className="block size-4 shrink-0 pointer-events-none" aria-hidden />}
      <span className="leading-none">{children}</span>
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      scrollActiveTabIntoView(scrollRef.current)
      return
    }
    scrollPageToTop()
    scrollActiveTabIntoView(scrollRef.current)
  }, [value])

  return (
    <div className={cn('min-w-0 flex-1 -mx-4 overflow-hidden', className)}>
      <motion.div
        ref={scrollRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={tabScrollClassName}
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
    </div>
  )
}
