'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { scrollActiveTabIntoView, scrollPageToTop } from '@/lib/utils/scroll'

const tabScrollClassName =
  'flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'

interface TabButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  value: string
  activeValue: string
  onClick: (value: string) => void
  children: ReactNode
  icon?: LucideIcon
  className?: string
}

export function TabButton({
  value,
  activeValue,
  onClick,
  children,
  icon: Icon,
  className = '',
  ...props
}: TabButtonProps) {
  const isActive = value === activeValue

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      data-active={isActive}
      className={cn(
        'mm-pill shrink-0 gap-1.5 whitespace-nowrap transition-colors',
        isActive ? 'mm-pill-active' : 'hover:bg-muted/60 hover:text-foreground',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="block size-3.5 shrink-0" strokeWidth={1.75} />}
      <span className="leading-none">{children}</span>
    </button>
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

  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      scrollActiveTabIntoView(scrollRef.current)
      return
    }
    scrollPageToTop()
    scrollActiveTabIntoView(scrollRef.current)
  }, [value])

  return (
    <div className={cn('min-w-0 flex-1 overflow-hidden', className)}>
      <div ref={scrollRef} className={tabScrollClassName}>
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
      </div>
    </div>
  )
}
