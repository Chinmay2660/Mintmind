'use client'

import { useEffect, useRef } from 'react'

/**
 * Page level keyboard shortcuts: `useKeys({ '1': openFirstTab, '[': previousMonth })`.
 * Like the global ones, they never fire while typing, with Ctrl, Alt or ⌘ held, or while a dialog or menu is open.
 */
export function useKeys(map: Record<string, () => void>) {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"]')) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const fn = ref.current[k]
      if (fn) { e.preventDefault(); fn() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
