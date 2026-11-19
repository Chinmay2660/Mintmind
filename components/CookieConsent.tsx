'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { OPEN_COOKIE_SETTINGS, clearPreferenceKeys, readConsent, writeConsent } from '@/lib/consent'

/**
 * Asks once. Essential storage is always on; remembering preferences needs a yes. Reject keeps the app fully working,
 * it just forgets theme and layout between visits. The choice can be changed from the footer or Settings.
 */
export default function CookieConsent() {
  const [decided, setDecided] = useState<boolean | null>(null) // null until we have looked
  const [prefs, setPrefs] = useState(false)
  const [manage, setManage] = useState(false)

  useEffect(() => {
    const c = readConsent()
    setDecided(!!c)
    setPrefs(!!c?.preferences)
    const reopen = () => { setPrefs(!!readConsent()?.preferences); setManage(true) }
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen)
  }, [])

  // When preferences are declined, nothing optional is kept between visits.
  useEffect(() => {
    if (decided === null || readConsent()?.preferences) return
    const wipe = () => { if (!readConsent()?.preferences) clearPreferenceKeys() }
    window.addEventListener('pagehide', wipe)
    return () => window.removeEventListener('pagehide', wipe)
  }, [decided, prefs])

  const choose = (p: boolean) => { writeConsent(p); setPrefs(p); setDecided(true); setManage(false) }

  return (
    <>
      {decided === false && createPortal(
        <section role="region" aria-label="Cookie consent" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 200, maxHeight: '85dvh', overflowY: 'auto', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }} className="border-t-2 border-[hsl(var(--edge))] bg-popover px-4 pt-4 text-popover-foreground shadow-elevated print:hidden sm:px-6">
          <div className="mx-auto flex max-w-6xl items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">Cookies and local storage</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Essential storage keeps you signed in and holds your records on this device, so it is always on. With your OK we also remember your theme, sidebar and planning inputs between visits.
                We don&apos;t use advertising or analytics cookies and nothing goes to a third party. <Link href="/cookies" className="font-medium text-foreground underline">What exactly is stored</Link>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => choose(true)}>Accept all</Button>
                <Button size="sm" variant="outline" onClick={() => choose(false)}>Essential only</Button>
                <Button size="sm" variant="ghost" onClick={() => setManage(true)}>Manage settings</Button>
              </div>
            </div>
          </div>
        </section>,
        document.body,
      )}

      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie settings</DialogTitle>
            <DialogDescription>Choose what this site may remember on your device.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            <li className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div><p className="text-sm font-bold">Essential</p><p className="mt-0.5 text-xs text-muted-foreground">Your sign-in session, the demo flag, your records stored on this device, and the failed-attempt counter that protects the vault. The app cannot work without these.</p></div>
              <Switch checked disabled onCheckedChange={() => {}} aria-label="Essential storage, always on" />
            </li>
            <li className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div><p className="text-sm font-bold">Preferences</p><p className="mt-0.5 text-xs text-muted-foreground">Remember light or dark mode, whether the sidebar is collapsed, which folders are open, your planning inputs and device notification choices.</p></div>
              <Switch checked={prefs} onCheckedChange={setPrefs} aria-label="Remember preferences" />
            </li>
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href="/cookies" className="text-xs underline" onClick={() => setManage(false)}>Read the cookie notice</Link>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setManage(false)}>Cancel</Button><Button onClick={() => choose(prefs)}>Save choices</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
