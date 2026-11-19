'use client'

import type { InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Mintmind checkbox. Drop-in for <input type="checkbox">: same checked / onChange / disabled props, and it still
 * works inside a <label>. The real input stays in the page (invisible, full size) so keyboards and screen readers use it.
 */
export function Checkbox({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <span className={cn('relative inline-flex h-5 w-5 shrink-0', className)}>
      <input type="checkbox" className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" {...props} />
      <span
        aria-hidden
        className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-[6px] border-2 border-muted-foreground/60 bg-transparent text-primary-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:opacity-50 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </span>
  )
}
