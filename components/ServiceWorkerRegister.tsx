'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { registerServiceWorker, warmOfflineCache } from '@/lib/pwa'

/** Renders nothing. Registers the service worker at startup, then caches the app for offline once the user is signed in. */
export default function ServiceWorkerRegister() {
  const { user } = useAuth()
  const signedIn = !!user && !(user as { demo?: boolean }).demo

  useEffect(() => {
    // The dev server serves constantly changing assets; an active worker there only causes stale pages.
    if (process.env.NODE_ENV !== 'production') {
      // and a worker left over from an earlier visit is removed, with its caches, so old scripts are never served again
      if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {})
      if (typeof caches !== 'undefined') caches.keys().then((ks) => ks.filter((k) => k.startsWith('mintmind-')).forEach((k) => caches.delete(k))).catch(() => {})
      return
    }
    registerServiceWorker()
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !signedIn) return
    const run = () => { warmOfflineCache() }
    if (document.readyState === 'complete') {
      const t = setTimeout(run, 3000) // let the current page finish loading first
      return () => clearTimeout(t)
    }
    window.addEventListener('load', run, { once: true })
    return () => window.removeEventListener('load', run)
  }, [signedIn])

  return null
}
