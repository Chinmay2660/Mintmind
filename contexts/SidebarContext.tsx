'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'mintmind_sidebar_open'

interface SidebarContextValue {
  isOpen: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setIsOpen(stored === 'true')
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
