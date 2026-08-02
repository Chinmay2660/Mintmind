'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'mintmind_sidebar_open'

function readStoredSidebarOpen(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

interface SidebarContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

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

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
