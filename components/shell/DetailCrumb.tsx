'use client'

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
}

export const usePageInfoValue = () => useContext(DetailCrumbContext).info

/** A page with no title of its own sends its explanation up to the top bar, where it sits beside the page name behind an "i". */
export function usePageInfo(info: ReactNode) {
  const { setInfo } = useContext(DetailCrumbContext)
  useEffect(() => { setInfo(info ?? null); return () => setInfo(null) }, [info, setInfo])
}
