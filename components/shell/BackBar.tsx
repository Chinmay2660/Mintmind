'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { canGoBackInApp } from '@/lib/navHistory'
import { cn } from '@/lib/utils'

/**
 * The one back control for pages reached by drilling down (an account, a fund, a policy, the loans list...). Same look and place
 * everywhere: an arrow and "Back" at the top left. It returns to where you came from; if you opened the page directly it goes to
 * `fallback`. A page that opens a record in place passes `onBack` to close it instead.
 */
export function BackBar({ fallback = '/dashboard', onBack, phoneOnly = false, className }: { fallback?: string; onBack?: () => void; /** wide screens have a breadcrumb, so a list page shows this on phones only */ phoneOnly?: boolean; className?: string }) {
  const router = useRouter()
  const go = () => { if (onBack) onBack(); else if (canGoBackInApp()) router.back(); else router.push(fallback) }
  return (
    <div className={cn('flex items-center', phoneOnly && 'md:hidden', className)}>
      <button type="button" onClick={go} className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring print:hidden">
        <ArrowLeft className="h-4 w-4" aria-hidden />Back
      </button>
    </div>
  )
}
