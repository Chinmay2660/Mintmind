'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'

const MIN_MS = 900

/**
 * A full-screen loading screen on phones. It is part of the server HTML, so it is on screen from the first paint, and it
 * fades away once the page has loaded (and has been up for a moment, so it never just flickers). If scripts never run, a CSS
 * animation removes it after a few seconds so it can never trap the screen. Wider screens never see it.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show')
  useEffect(() => {
    const t0 = performance.now()
    let t: ReturnType<typeof setTimeout>
    const done = () => { t = setTimeout(() => { setPhase('fade'); t = setTimeout(() => setPhase('gone'), 350) }, Math.max(0, MIN_MS - (performance.now() - t0))) }
    if (document.readyState === 'complete') done(); else window.addEventListener('load', done, { once: true })
    return () => { clearTimeout(t); window.removeEventListener('load', done) }
  }, [])
  if (phase === 'gone') return null
  return (
    <div role="status" aria-live="polite" aria-label="Loading Mintmind" data-splash
      className={`splash fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-opacity duration-300 md:hidden print:hidden ${phase === 'fade' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 motion-safe:animate-pulse"><Wallet className="h-10 w-10" strokeWidth={2} aria-hidden /></span>
      <div className="text-center">
        <p className="text-2xl font-semibold tracking-tight">Mintmind</p>
        <p className="mt-1 text-sm text-muted-foreground">Getting your money picture ready…</p>
      </div>
      <span className="h-1 w-32 overflow-hidden rounded-full bg-muted" aria-hidden><span className="block h-full w-1/2 rounded-full bg-primary motion-safe:animate-[splash-bar_1.2s_ease-in-out_infinite]" /></span>
    </div>
  )
}
