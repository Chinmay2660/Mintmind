'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { canGoBackInApp } from '@/lib/navHistory'
import { cn } from '@/lib/utils'

/**
 * The one back control, for a view you drilled into (an account, a fund, a policy, a record opened in place). Phones only: a wide screen
 * has the sidebar and the breadcrumb, and a section's own page needs none because the bottom bar switches sections. Same look and place
 * everywhere: an arrow and "Back" at the top left. It returns to where you came from; if you opened the page directly it goes to
 * `fallback`. A page that opens a record in place passes `onBack` to close it instead.
 */
export function BackBar({ fallback = '/dashboard', onBack, className }: { fallback?: string; onBack?: () => void; className?: string }) {
  const router = useRouter()
  const go = () => { if (onBack) onBack(); else if (canGoBackInApp()) router.back(); else router.push(fallback) }
  return (
    <div className={cn('flex items-center md:hidden', className)}>
      <button type="button" onClick={go} className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring print:hidden">
        <ArrowLeft className="h-4 w-4" aria-hidden />Back
      </button>
    </div>
  )
}
