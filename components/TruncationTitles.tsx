'use client'

import { useEffect } from 'react'

/**
 * Anywhere text is cut short with an ellipsis (a truncated line, a clamped paragraph), hovering it shows the full text
 * as a tooltip. It checks on hover, so only text that really is cut off gets one, and it covers the whole app
 * without each place needing its own title. Renders nothing.
 */
export default function TruncationTitles() {
  useEffect(() => {
    const clipped = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      const el = t?.closest?.('.truncate, [class*="line-clamp"], [class*="text-ellipsis"]') as HTMLElement | null
      if (!el || el.hasAttribute('title') || el.closest('[role="tooltip"], [data-radix-popper-content-wrapper]')) return
      if (clipped(el)) {
        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
        if (text) el.setAttribute('title', text)
      }
    }
    document.addEventListener('mouseover', onOver, { passive: true })
    return () => document.removeEventListener('mouseover', onOver)
  }, [])
  return null
}
