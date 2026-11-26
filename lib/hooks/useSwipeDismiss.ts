'use client'

import { useCallback, useRef } from 'react'

const PHONE = '(max-width: 639px)'

/**
 * Drag a bottom sheet down to close it. Returns a callback ref for the sheet element.
 * The sheet follows the finger, then either closes (a long or quick drag) or springs back.
 * It only starts when the touch is on something that is not scrolled (or cannot scroll), so scrolling a long list still works,
 * and never from a text field, a select or a slider. On a wider screen, where dialogs are centred, it does nothing.
 */
export function useSwipeDismiss(onDismiss: () => void) {
  const cleanup = useRef<(() => void) | null>(null)
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss

  return useCallback((el: HTMLElement | null) => {
    cleanup.current?.(); cleanup.current = null
    if (!el) return
    let startY = 0, dy = 0, t0 = 0, tracking = false

    const scroller = (target: EventTarget | null): HTMLElement | null => {
      for (let n = target as HTMLElement | null; n; n = n.parentElement) {
        if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) return n
        if (n === el) break
      }
      return null
    }
    const start = (e: TouchEvent) => {
      tracking = false
      if (!window.matchMedia(PHONE).matches || e.touches.length !== 1) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [role="slider"], [data-no-swipe]')) return
      const s = scroller(t)
      if (s && s.scrollTop > 0) return
      tracking = true; startY = e.touches[0].clientY; dy = 0; t0 = Date.now()
    }
    const move = (e: TouchEvent) => {
      if (!tracking) return
      dy = e.touches[0].clientY - startY
      if (dy <= 0) { el.style.transform = ''; return }
      if (e.cancelable) e.preventDefault() // stops the page behind from scrolling or pulling to refresh
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`
    }
    const end = () => {
      if (!tracking) return
      tracking = false
      el.style.transition = 'transform 180ms ease-out'
      if (dy > 110 || (dy > 40 && Date.now() - t0 < 250)) {
        el.style.transform = 'translateY(100%)'; dismiss.current()
        // a form with unsaved changes asks first and stays open: bring the sheet back
        setTimeout(() => { if (el.isConnected && el.getAttribute('data-state') === 'open') el.style.transform = '' }, 300)
      } else el.style.transform = ''
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    cleanup.current = () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end) }
  }, [])
}
