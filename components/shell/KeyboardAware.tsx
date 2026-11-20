'use client'

import { useEffect } from 'react'

const FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=range]), select'

/**
 * Phone keyboard behaviour, in one place:
 * - `--kb-inset` is how much of the bottom the on-screen keyboard covers (iOS Safari overlays it instead of resizing the page),
 *   so bottom sheets and dialogs lift above it.
 * - A focused field is scrolled into view once the keyboard is up.
 * - Inside a dialog, Enter on a field moves to the next one; on the last field it submits. The keyboard key says Next or Done to match.
 * - Submitting a dialog form drops the keyboard.
 */
export function KeyboardAware() {
  useEffect(() => {
    const root = document.documentElement
    const vv = window.visualViewport
    const update = () => {
      if (!vv) return
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      root.style.setProperty('--kb-inset', inset > 80 ? `${inset}px` : '0px')
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)

    const fieldsOf = (el: HTMLElement) => Array.from(el.closest('form')?.querySelectorAll<HTMLElement>(`${FIELD}, textarea`) ?? []).filter((f) => !(f as HTMLInputElement).disabled && f.offsetParent !== null && (f as HTMLInputElement).type !== 'hidden')

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target
      if (!(el instanceof HTMLElement) || !el.matches(`${FIELD}, textarea`)) return
      if (el.closest('[role="dialog"]') && !(el instanceof HTMLTextAreaElement) && !el.hasAttribute('enterkeyhint')) {
        const list = fieldsOf(el)
        el.setAttribute('enterkeyhint', list.indexOf(el) < list.length - 1 ? 'next' : 'done')
      }
      // wait for the keyboard to finish opening, then keep the field in view
      window.setTimeout(() => { if (document.activeElement === el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, 300)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target
      if (e.key !== 'Enter' || e.isComposing || !(el instanceof HTMLInputElement) || !el.closest('[role="dialog"] form')) return
      if (['submit', 'button', 'checkbox', 'radio'].includes(el.type) || e.defaultPrevented) return
      const list = fieldsOf(el)
      const next = list[list.indexOf(el) + 1]
      if (next) { e.preventDefault(); next.focus() }
    }
    const onSubmit = () => { const a = document.activeElement; if (a instanceof HTMLElement && a.closest('[role="dialog"]')) a.blur() }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('submit', onSubmit, true)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('submit', onSubmit, true)
    }
  }, [])
  return null
}
