'use client'

import { dialogJustPopped, expectSelfPop, isSelfPop } from '@/lib/navHistory'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface Crumb { label: string; onBack: () => void }
interface Ctx { crumb: Crumb | null; set: (c: Crumb | null) => void; info: ReactNode; setInfo: (n: ReactNode) => void }

const DetailCrumbContext = createContext<Ctx>({ crumb: null, set: () => {}, info: null, setInfo: () => {} })

/** Holds the name of the record a page currently has open (a card, a goal, a policy), so the breadcrumb can show it. */
export function DetailCrumbProvider({ children }: { children: ReactNode }) {
  const [crumb, setCrumb] = useState<Crumb | null>(null)
  const [info, setInfo] = useState<ReactNode>(null)
  const set = useCallback((c: Crumb | null) => setCrumb(c), [])
  const value = useMemo(() => ({ crumb, set, info, setInfo }), [crumb, set, info])
  return <DetailCrumbContext.Provider value={value}>{children}</DetailCrumbContext.Provider>
}

export const useDetailCrumbValue = () => useContext(DetailCrumbContext).crumb

/**
 * Call from a page that opens a record in place. While `label` is set the breadcrumb reads
 * Overview / Cards / <label>, and the parent crumb takes you back to the list.
 */
export function useDetailCrumb(label: string | null | undefined, onBack: () => void) {
  const { set } = useContext(DetailCrumbContext)
  const back = useRef(onBack)
  back.current = onBack
  useEffect(() => {
    if (!label) { set(null); return }
    set({ label, onBack: () => back.current() })
    return () => set(null)
  }, [label, set])

  // The browser's Back button (and a phone's back gesture) should close the open record and stay on the page, not leave it.
  const open = !!label
  const run = useRef(0)
  useEffect(() => {
    if (!open) return
    const mine = ++run.current
    let ours = true
    // an entry that is already there (React may run an effect twice while developing) is reused
    if (!(window.history.state as any)?.mmDetail) window.history.pushState({ ...(window.history.state || {}), mmDetail: true }, '')
    // a dialog above this record may be the thing Back was meant for: look again once it has had its turn
    const onPop = (e: Event) => { if (isSelfPop(e)) return; setTimeout(() => { if (dialogJustPopped()) return; if (ours) { ours = false; back.current() } }, 0) }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      const was = ours
      ours = false
      // closed from the screen rather than with Back: take the extra entry off again, but only if it is still the current one and no newer run took over
      setTimeout(() => {
        if (run.current !== mine || !was) return
        if ((window.history.state as any)?.mmDetail) { expectSelfPop(); window.history.back() }
      }, 0)
    }
  }, [open])
}

export const usePageInfoValue = () => useContext(DetailCrumbContext).info

/** A page with no title of its own sends its explanation up to the top bar, where it sits beside the page name behind an "i". */
export function usePageInfo(info: ReactNode) {
  const { setInfo } = useContext(DetailCrumbContext)
  useEffect(() => { setInfo(info ?? null); return () => setInfo(null) }, [info, setInfo])
}
