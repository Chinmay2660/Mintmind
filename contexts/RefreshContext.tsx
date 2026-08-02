'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'

type RefreshFn = () => void | Promise<void>

const RefreshContext = createContext<{
  setHandler: (fn: RefreshFn | null) => void
  getHandler: () => RefreshFn | null
} | null>(null)

export function RefreshProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<RefreshFn | null>(null)

  const setHandler = useCallback((fn: RefreshFn | null) => {
    handlerRef.current = fn
  }, [])

  const getHandler = useCallback(() => handlerRef.current, [])

  return (
    <RefreshContext.Provider value={{ setHandler, getHandler }}>
      {children}
    </RefreshContext.Provider>
  )
}

export function useRegisterRefresh(onRefresh: RefreshFn) {
  const ctx = useContext(RefreshContext)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!ctx) return
    ctx.setHandler(() => onRefreshRef.current())
    return () => ctx.setHandler(null)
  }, [ctx])
}

export function useRefreshHandler() {
  const ctx = useContext(RefreshContext)
  return useCallback(async () => {
    const fn = ctx?.getHandler()
    if (fn) await fn()
  }, [ctx])
}
