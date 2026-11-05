'use client'

import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // fallback for non-secure contexts / blocked clipboard API
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (!ok) throw new Error('copy failed')
  }
}

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [done, setDone] = useState(false)
  if (!value) return null
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      onClick={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try {
          await copyText(value)
          setDone(true)
          toast.success(`${label} copied`)
          setTimeout(() => setDone(false), 1500)
        } catch {
          toast.error('Could not copy. Select the text and copy manually.')
        }
      }}
      className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

/** A value with a copy button next to it (text stays selectable). */
export function CopyValue({ value, label, children, mono }: { value?: string | null; label: string; children?: ReactNode; mono?: boolean }) {
  if (!value) return <span>—</span>
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <span className={cn('min-w-0 select-all break-all', mono && 'font-mono')}>{children ?? value}</span>
      <CopyButton value={value} label={label} />
    </span>
  )
}
