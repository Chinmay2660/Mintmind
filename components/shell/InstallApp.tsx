'use client'

import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canStorePreferences } from '@/lib/consent'

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'mac-safari' | 'other'

/** Works out how this browser installs a web app. null until the first check on the device. */
export function useInstall() {
  const [mode, setMode] = useState<InstallMode | null>(null)
  const [deferred, setDeferred] = useState<any>(null)
  useEffect(() => {
    const ua = navigator.userAgent
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/.test(ua)
    if (standalone) setMode('installed')
    else if (iOS) setMode('ios')
    else if (safari && /Macintosh/.test(ua)) setMode('mac-safari')
    else setMode('other')
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e); setMode('prompt') }
    const onInstalled = () => { setDeferred(null); setMode('installed') }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  const install = async () => { await deferred?.prompt(); await deferred?.userChoice?.catch(() => {}); setDeferred(null) }
  return { mode, install }
}

/**
 * Safari never offers to install a web app on its own, and iPhone and iPad have no install event at all,
 * so this tells the person which steps their browser needs. Chrome and Edge get a real Install button.
 */
export function InstallApp() {
  const { mode, install } = useInstall()

  if (!mode) return null
  if (mode === 'installed') return <p className="text-sm text-muted-foreground">Mintmind is installed on this device.</p>
  if (mode === 'prompt') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Add Mintmind to your home screen or desktop. It opens in its own window and works offline.</p>
        <Button onClick={install}><Download className="mr-2 h-4 w-4" />Install app</Button>
      </div>
    )
  }
  if (mode === 'ios') {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">Safari on iPhone and iPad does not show an install button. Add it by hand, and open this page in Safari, not inside another app.</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Tap the Share button <Share className="inline h-4 w-4 align-text-bottom" aria-label="Share" /> in the Safari toolbar.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong> <SquarePlus className="inline h-4 w-4 align-text-bottom" aria-hidden />.</li>
          <li>Tap <strong>Add</strong>. Open Mintmind from the new icon.</li>
        </ol>
      </div>
    )
  }
  if (mode === 'mac-safari') {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">Safari on Mac does not show an install button (needs Safari 17 or newer).</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>In the menu bar choose <strong>File, then Add to Dock</strong>.</li>
          <li>Click <strong>Add</strong>. Open Mintmind from the Dock.</li>
        </ol>
      </div>
    )
  }
  return <p className="text-sm text-muted-foreground">Look for an install icon in your browser&apos;s address bar, or open the browser menu and choose Install or Add to Home Screen. It has to be opened over HTTPS.</p>
}

const DISMISS_KEY = 'mm-install-dismissed'

/** A clear, dismissible card at the top of the dashboard until the app is installed (or the person says no thanks). */
export function InstallBanner() {
  const { mode, install } = useInstall()
  const [hidden, setHidden] = useState(true)
  const [steps, setSteps] = useState(false)
  useEffect(() => { try { setHidden(localStorage.getItem(DISMISS_KEY) === '1') } catch { setHidden(false) } }, [])
  // Chrome and Edge only show this while an install is on offer, so it goes away once the app is installed. Where nothing can be done, say nothing.
  if (!mode || mode === 'installed' || mode === 'other' || hidden) return null
  const dismiss = () => { setHidden(true); if (canStorePreferences()) { try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* it just comes back next visit */ } } }
  const hint = mode === 'ios' ? 'Tap Share, then Add to Home Screen.' : mode === 'mac-safari' ? 'In Safari choose File, then Add to Dock.' : 'Use your browser menu: Install or Add to Home Screen.'
  return (
    <section aria-label="Install Mintmind" className="surface-card flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"><Download className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Mintmind on this device</p>
        <p className="text-xs text-muted-foreground">Opens in its own window, loads fast and works offline.{mode !== 'prompt' && steps ? ` ${hint}` : ''}</p>
      </div>
      {mode === 'prompt'
        ? <Button size="sm" onClick={install}><Download className="mr-1.5 h-4 w-4" />Install</Button>
        : <Button size="sm" onClick={() => setSteps((v) => !v)} aria-expanded={steps}>How to install</Button>}
      {mode !== 'prompt' && <button type="button" onClick={dismiss} className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">Already installed</button>}
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" aria-hidden /></button>
    </section>
  )
}
