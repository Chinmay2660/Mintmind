'use client'

import { useEffect } from 'react'
import { UI_STYLE_KEY, normaliseStyle } from '@/lib/uiStyle'
import { LOOK_EVENT, applyIcon } from '@/lib/uiIcon'

/** Renders nothing. Keeps the browser tab icon in the colour of the chosen look, now and whenever the look changes. */
export function LookIcon() {
  useEffect(() => {
    const current = () => { try { return normaliseStyle(localStorage.getItem(UI_STYLE_KEY)) } catch { return normaliseStyle(null) } }
    let look = current()
    applyIcon(look)
    const on = (e: Event) => { look = normaliseStyle((e as CustomEvent<string>).detail ?? current()); applyIcon(look) }
    window.addEventListener(LOOK_EVENT, on)
    // Next puts its own icon links back when a page changes, so keep ours in place
    const watch = new MutationObserver(() => { applyIcon(look) })
    watch.observe(document.head, { childList: true })
    return () => { window.removeEventListener(LOOK_EVENT, on); watch.disconnect() }
  }, [])
  return null
}
