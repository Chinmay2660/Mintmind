'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDetailCrumbValue } from './DetailCrumb'
import { notePage } from '@/lib/navHistory'

/**
 * On a touch screen, swiping right from the left edge goes back: out of an open record (a card, a goal, a policy) to its list,
 * or to the previous page. It does nothing while a dialog or sheet is open, and a sideways swipe that does not start at
 * the edge is left alone, so month swipes, carousels and scrolling lists keep working.
 */
export function EdgeSwipeBack() {
  const crumb = useDetailCrumbValue()
  const router = useRouter()
  const path = usePathname()
  const back = useRef<() => void>(() => {})
  useEffect(() => { notePage(path) }, [path])
  back.current = () => { if (crumb) crumb.onBack(); else if (path !== '/dashboard') router.back() }

  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null
    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      // Not when the touch belongs to something else: a swipeable row (its right swipe is "edit"), a field, a slider, or an open dialog or sheet.
      const own = e.target instanceof Element && e.target.closest('[data-swipe-row], input, textarea, [role="slider"]')
      start = e.touches.length === 1 && t.clientX <= 20 && !own && !document.querySelector('[role="dialog"]') ? { x: t.clientX, y: t.clientY, t: Date.now() } : null
    }
    const cancel = () => { start = null }
    const up = (e: TouchEvent) => {
      const s = start; start = null
      if (!s) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s.x, dy = Math.abs(t.clientY - s.y)
      if (dx > 70 && dy < 50 && Date.now() - s.t < 700 && !document.querySelector('[role="dialog"]')) back.current()
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up, { passive: true })
    window.addEventListener('touchcancel', cancel, { passive: true }) // the browser took the gesture (scroll, system back): do nothing
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchend', up); window.removeEventListener('touchcancel', cancel) }
  }, [])
  return null
}
