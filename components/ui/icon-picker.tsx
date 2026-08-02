'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const ICON_OPTIONS = [
  '📁', '🏦', '💳', '💰', '💵', '💸', '🪙', '🏧',
  '🛒', '🛍️', '🏪', '🍔', '🍕', '🍎', '☕', '🍽️',
  '🚗', '⛽', '🚌', '✈️', '🏠', '🏡', '💡', '🔌',
  '🎬', '🎮', '🎵', '💊', '🏥', '💪', '📚', '🎓',
  '💼', '👔', '🎯', '⭐', '❤️', '🎁', '📱', '🐾',
  '🌿', '👶', '👕', '✂️', '🧾', '📊', '🏋️', '🎉',
] as const

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  className?: string
}

function IconGrid({
  value,
  onSelect,
}: {
  value: string
  onSelect: (icon: string) => void
}) {
  const icons = value && !ICON_OPTIONS.includes(value as (typeof ICON_OPTIONS)[number])
    ? [value, ...ICON_OPTIONS]
    : ICON_OPTIONS

  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {icons.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onSelect(icon)}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-accent',
            value === icon && 'bg-primary/15 ring-2 ring-primary'
          )}
          aria-label={`Select ${icon} icon`}
          aria-pressed={value === icon}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  const handleSelect = (icon: string) => {
    onChange(icon)
    setOpen(false)
  }

  const pickerContent = (
    <IconGrid value={value} onSelect={handleSelect} />
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-10 w-full items-center justify-center rounded-xl border surface-input text-2xl ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          className
        )}
        aria-label="Choose icon"
      >
        {value || '📁'}
      </button>

      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Choose icon</SheetTitle>
            </SheetHeader>
            <div className="mt-4 max-h-[50vh] overflow-y-auto pb-4">{pickerContent}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Choose icon</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">{pickerContent}</div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
