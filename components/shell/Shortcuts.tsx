'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Keyboard } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppSearch } from '@/contexts/AppSearchContext'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useAssistant } from '@/components/ai/AssistantProvider'
import { GO_TO, SHORTCUT_GROUPS } from '@/lib/shortcuts'

export const SHOW_SHORTCUTS_EVENT = 'mm:show-shortcuts'
export const QUICK_ADD_EVENT = 'mm:quick-add'

const Key = ({ children }: { children: string }) => (
  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 text-[11px] font-bold shadow-[0_1px_0_hsl(var(--border))]">{children}</kbd>
)

/** One place for every keyboard shortcut: it listens for the keys and shows the help list. Renders nothing until the list is opened. */
export function Shortcuts() {
  const router = useRouter()
  const { open: openSearch } = useAppSearch()
  const { togglePrivacyMode } = usePrivacyMode()
  const { open: openAssistant } = useAssistant()
  const { resolvedTheme, setTheme } = useTheme()
  const [help, setHelp] = useState(false)
  const chord = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const show = () => setHelp(true)
    window.addEventListener(SHOW_SHORTCUTS_EVENT, show)
    return () => window.removeEventListener(SHOW_SHORTCUTS_EVENT, show)
  }, [])

  useEffect(() => {
    const quick = (what: string) => window.dispatchEvent(new CustomEvent(QUICK_ADD_EVENT, { detail: what }))
    const clearChord = () => { if (chord.current) { clearTimeout(chord.current); chord.current = null } }

    const onKey = (e: KeyboardEvent) => {
      // never while typing, with a modifier held (Ctrl K and friends have their own handlers), or with a dialog open
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"]')) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key

      // second key of "G then ..."
      if (chord.current) {
        clearChord()
        const dest = GO_TO[k]
        if (dest) { e.preventDefault(); router.push(dest.path) }
        return
      }
      if (k === 'g') {
        e.preventDefault()
        chord.current = setTimeout(() => { chord.current = null }, 1500)
        toast.message('Go to…', { id: 'go-to', duration: 1500, description: Object.entries(GO_TO).map(([key, v]) => `${key.toUpperCase()} ${v.label}`).join('  ·  ') })
        return
      }
      if (k === '/') { e.preventDefault(); openSearch() }
      else if (k === '?') { e.preventDefault(); setHelp(true) }
      else if (k === 'a') { e.preventDefault(); quick('txn') }
      else if (k === 'c') { e.preventDefault(); quick('account') }
      else if (k === 'n') { e.preventDefault(); router.push('/dashboard/net-worth/manage?add=asset') }
      else if (k === 'i') { e.preventDefault(); router.push('/dashboard/mutual-funds?add=fund') }
      else if (k === 'l') { e.preventDefault(); router.push('/dashboard/net-worth/manage?add=liability') }
      else if (k === 'o') { e.preventDefault(); router.push('/dashboard/net-worth?add=goal') }
      else if (k === 'w') { e.preventDefault(); openAssistant() }
      else if (k === 'p') { e.preventDefault(); togglePrivacyMode() }
      else if (k === 't') { e.preventDefault(); setTheme(resolvedTheme === 'dark' ? 'light' : 'dark') }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); clearChord() }
  }, [router, openSearch, togglePrivacyMode, openAssistant, resolvedTheme, setTheme])

  return (
    <Dialog open={help} onOpenChange={setHelp}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Keyboard className="h-4 w-4" aria-hidden />Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts pause while you type in a field or while a dialog is open. Press <Key>?</Key> any time to see this list.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{g.title}</h3>
              <ul className="space-y-1.5">
                {g.items.map((s) => (
                  <li key={g.title + s.label + s.keys.join('')} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0">{s.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((key, i) => <Fragment key={key + i}>{i > 0 && <span className="text-[11px] text-muted-foreground">{s.then ? 'then' : '+'}</span>}<Key>{key}</Key></Fragment>)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
