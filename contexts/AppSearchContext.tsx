'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface AppSearchContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const AppSearchContext = createContext<AppSearchContextValue | null>(null)

export function AppSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        toggle()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  return (
    <AppSearchContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </AppSearchContext.Provider>
  )
}

export function useAppSearch() {
  const context = useContext(AppSearchContext)
  if (!context) {
    throw new Error('useAppSearch must be used within AppSearchProvider')
  }
  return context
}
