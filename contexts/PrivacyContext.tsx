'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'mintmind_privacy_mode'

interface PrivacyContextValue {
  privacyMode: boolean
  togglePrivacyMode: () => void
  setPrivacyMode: (value: boolean) => void
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null)

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyModeState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setPrivacyModeState(localStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      /* ponytail: localStorage blocked — default off */
    }
    setHydrated(true)
  }, [])

  const setPrivacyMode = useCallback((value: boolean) => {
    setPrivacyModeState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      /* ignore */
    }
  }, [])

  const togglePrivacyMode = useCallback(() => {
    setPrivacyMode(!privacyMode)
  }, [privacyMode, setPrivacyMode])

  const value = useMemo(
    () => ({ privacyMode: hydrated ? privacyMode : false, togglePrivacyMode, setPrivacyMode }),
    [hydrated, privacyMode, togglePrivacyMode, setPrivacyMode]
  )

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

export function usePrivacyMode() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacyMode must be used within PrivacyProvider')
  return ctx
}
