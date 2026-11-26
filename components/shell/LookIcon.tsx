'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { UI_STYLE_KEY, normaliseStyle } from '@/lib/uiStyle'
import { LOOK_EVENT, applyIcon } from '@/lib/uiIcon'

/** Renders nothing. Keeps the browser tab icon in the colour of the chosen look, and the browser bar in the app's theme colour. */
export function LookIcon() {
  const { resolvedTheme } = useTheme()
  // the browser bar and phone status bar match the app's theme, not the device's
  useEffect(() => {
    if (!resolvedTheme) return
    const color = resolvedTheme === 'dark' ? '#120F1A' : '#F6F6F8'
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')]
    if (!metas.length) { const m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); metas.push(m) }
    metas.forEach((m) => { m.setAttribute('content', color); m.removeAttribute('media') })
  }, [resolvedTheme])
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
