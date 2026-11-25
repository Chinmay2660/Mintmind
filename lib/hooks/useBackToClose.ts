'use client'

import { useEffect, useRef } from 'react'
import { expectSelfPop, isSelfPop, markDialogPop } from '@/lib/navHistory'

/**
 * Makes the browser's Back button (and a phone's back gesture) close an open dialog instead of leaving the page, which would
 * throw away whatever was typed. While `open`, one history entry is added; Back removes it and closes the dialog. If the dialog
 * is closed from the screen instead, the entry is taken off again, so the history ends up as it began.
 * React may run an effect twice in a row while developing: an entry that is already there is reused, and one is only removed
 * once no newer run has taken over.
 */
export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = useRef(close)
  closeRef.current = close
  const run = useRef(0)
  useEffect(() => {
    if (!open) return
    const mine = ++run.current
    let ours = true
    if (!(window.history.state as { mmDialog?: boolean } | null)?.mmDialog) window.history.pushState({ ...(window.history.state || {}), mmDialog: true }, '')
    const onPop = (e: Event) => { if (isSelfPop(e)) return; if (ours) { ours = false; markDialogPop(); closeRef.current() } }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      const was = ours
      ours = false
      setTimeout(() => {
        if (run.current !== mine || !was) return
        if ((window.history.state as { mmDialog?: boolean } | null)?.mmDialog) { expectSelfPop(); window.history.back() }
      }, 0)
    }
  }, [open])
}
