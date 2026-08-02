'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'mintmind_sidebar_open'

function readStoredSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

interface SidebarContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  // ponytail: once per app load — not tied to route/tab changes
  useEffect(() => {
    setIsOpen(readStoredSidebarOpen())
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    localStorage.setItem(STORAGE_KEY, 'false')
  }, [])

  return (
    <SidebarContext.Provider value={{ isOpen, open, close }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
