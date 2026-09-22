'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { SessionExpiryDialog } from '@/components/SessionExpiryDialog'
import { useAuth } from '@/lib/hooks/useAuth'

const SESSION_MS = 15 * 60 * 1000
const WARNING_MS = 60 * 1000
const WARNING_SECONDS = Math.floor(WARNING_MS / 1000)

interface IdleTimeoutContextValue {
  resetTimer: () => void
}

const IdleTimeoutContext = createContext<IdleTimeoutContextValue>({ resetTimer: () => {} })

export function useIdleTimeout() {
  return useContext(IdleTimeoutContext)
}

export function IdleTimeoutProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS)
  const [loggingOut, setLoggingOut] = useState(false)

  const expiresAtRef = useRef<number>(0)
  const showWarningRef = useRef(false)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  showWarningRef.current = showWarning

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    warningTimerRef.current = null
    countdownRef.current = null
  }, [])

  const logout = useCallback(async () => {
    clearTimers()
    setShowWarning(false)
    setLoggingOut(true)
    try {
      await signOut()
    } finally {
      setLoggingOut(false)
    }
  }, [clearTimers, signOut])

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)

    const tick = () => {
      const remainingMs = expiresAtRef.current - Date.now()
      const nextSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
      setSecondsLeft(nextSeconds)

      if (remainingMs <= 0) {
        clearInterval(countdownRef.current!)
        countdownRef.current = null
        logout()
      }
    }

    tick()
    countdownRef.current = setInterval(tick, 1000)
  }, [logout])

  const resetTimer = useCallback(() => {
    if (!user) return

    clearTimers()
    setShowWarning(false)
    setSecondsLeft(WARNING_SECONDS)
    expiresAtRef.current = Date.now() + SESSION_MS

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      startCountdown()
    }, SESSION_MS - WARNING_MS)
  }, [user, clearTimers, startCountdown])

  useEffect(() => {
    if (!user) {
      clearTimers()
      setShowWarning(false)
      return
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    const onActivity = () => {
      if (showWarningRef.current) return
      resetTimer()
    }

    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    resetTimer()

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity))
      clearTimers()
    }
  }, [user, resetTimer, clearTimers])

  return (
    <IdleTimeoutContext.Provider value={{ resetTimer }}>
      {children}
      <SessionExpiryDialog
        open={showWarning}
        secondsLeft={secondsLeft}
        totalSeconds={WARNING_SECONDS}
        onStayLoggedIn={resetTimer}
        onLogout={logout}
        loggingOut={loggingOut}
      />
    </IdleTimeoutContext.Provider>
  )
}
