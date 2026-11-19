'use client'

import { OPEN_COOKIE_SETTINGS } from '@/lib/consent'

/** Reopens the cookie choices. Used in the footer, on the cookie notice and in Settings. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))} className={className ?? 'rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'}>
      Cookie settings
    </button>
  )
}
