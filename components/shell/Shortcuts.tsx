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
import { cn } from '@/lib/utils'

const SHORT_TITLE: Record<string, string> = { 'Add something': 'Add', 'Go to a page': 'Go to', 'On the Transactions & budgets page': 'Budget', Everywhere: 'Anywhere', 'Lists and menus': 'Lists' }

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
  const [group, setGroup] = useState(0)
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
      else if (k === 'l') { e.preventDefault(); router.push('/dashboard/net-worth/loans?add=liability') }
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Keyboard className="h-4 w-4" aria-hidden />Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts pause while you type in a field or while a dialog is open. Press <Key>?</Key> any time to see this list.</DialogDescription>
        </DialogHeader>
        {/* one group at a time keeps the list short; arrow keys move between the tabs */}
        <div role="tablist" aria-label="Shortcut groups" className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-0.5"
          onKeyDown={(e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const n = (group + d + SHORTCUT_GROUPS.length) % SHORTCUT_GROUPS.length; setGroup(n); requestAnimationFrame(() => (document.getElementById(`sc-tab-${n}`) as HTMLElement | null)?.focus()) }}>
          {SHORTCUT_GROUPS.map((g, i) => (
            <button key={g.title} id={`sc-tab-${i}`} type="button" role="tab" aria-selected={group === i} aria-controls="sc-panel" tabIndex={group === i ? 0 : -1} onClick={() => setGroup(i)}
              className={cn('flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring', group === i ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground')}>{SHORT_TITLE[g.title] ?? g.title}</button>
          ))}
        </div>
        <div id="sc-panel" role="tabpanel" aria-label={SHORTCUT_GROUPS[group].title} tabIndex={0} className="max-h-[55vh] overflow-y-auto pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ul className="divide-y divide-border/60">
            {SHORTCUT_GROUPS[group].items.map((s) => (
              <li key={s.label + s.keys.join('')} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <span className="min-w-0"><span className="block">{s.label}</span>{s.hint && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{s.hint}</span>}</span>
                <span className="flex shrink-0 items-center gap-1 pt-px" role="img" aria-label={s.keys.join(s.then ? ' then ' : ' plus ')}>
                  {s.keys.map((key, i) => <Fragment key={key + i}>{i > 0 && <span aria-hidden className="text-[11px] text-muted-foreground">{s.then ? 'then' : '+'}</span>}<span aria-hidden><Key>{key}</Key></span></Fragment>)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
