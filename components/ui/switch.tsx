'use client'

import { cn } from '@/lib/utils'

/** On/off switch. The tap area is 44px tall even though the track is smaller. State is also shown by the thumb position, not colour alone. */
export function Switch({ checked, onCheckedChange, disabled, 'aria-label': ariaLabel, className }: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  'aria-label': string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn('group flex h-11 w-14 shrink-0 items-center justify-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-60', className)}
    >
      <span className={cn('relative h-7 w-12 rounded-full border-2 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background', checked ? 'border-primary bg-primary' : 'border-muted-foreground/50 bg-muted')}>
        <span className={cn('absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all', checked ? 'left-[calc(100%-1.375rem)]' : 'left-0.5')} />
      </span>
    </button>
  )
}
