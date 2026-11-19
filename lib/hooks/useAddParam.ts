'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Lets another part of the app open this page's add form: go to "/page?add=<what>" and the page opens it once.
 * The parameter is removed straight away, so a refresh does not open the form again.
 */
export function useAddParam(onAdd: (what: string) => void) {
  const pathname = usePathname()
  useEffect(() => {
    const what = new URLSearchParams(window.location.search).get('add')
    if (!what) return
    onAdd(what)
    // remove the parameter without a navigation, so the form opens once and a refresh does not reopen it
    window.history.replaceState(null, '', pathname)
    // run once, when the page first shows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
