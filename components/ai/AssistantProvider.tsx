'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import dynamic from 'next/dynamic'

// the chat, and everything it pulls in, is fetched the first time the panel opens
const AssistantChat = dynamic(() => import('./AssistantChat').then((m) => m.AssistantChat), { ssr: false, loading: () => <p className="p-4 text-sm text-muted-foreground">Loading…</p> })
import { useFeatures } from '@/lib/features/FeaturesContext'

const Ctx = createContext<{ open: () => void } | null>(null)

/** Floating "Wealth AI" button + slide-over assistant available on every dashboard screen. */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const mobile = useIsMobile()
  const { isEnabled } = useFeatures()
  const aiOn = isEnabled('ai_assistant')
  const value = useMemo(() => ({ open: () => setOpen(true) }), [])
  return (
    <Ctx.Provider value={value}>
      {children}
      {aiOn && <button type="button" onClick={() => setOpen(true)} aria-label="Ask My Wealth AI"
        className="fab fixed right-4 z-40 flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-primary p-0 text-sm sm:w-auto sm:px-4 font-semibold text-primary-foreground shadow-elevated outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bottom-[calc(var(--mobile-tab-bar-height)+var(--mobile-safe-bottom)+0.75rem)] md:bottom-6 paper:border paper:border-[hsl(var(--edge))] paper:shadow-[1.5px_3px_0_0_hsl(var(--drop))] print:hidden">
        <Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Wealth AI</span>
      </button>}
      <Sheet open={isOpen && aiOn} onOpenChange={setOpen}>
        <SheetContent side={mobile ? 'bottom' : 'right'} className={mobile ? 'flex h-[88dvh] flex-col rounded-t-2xl border-t border-border bg-card pb-4' : 'flex w-full flex-col bg-card sm:max-w-xl lg:max-w-2xl'}>
          <SheetHeader className="text-left"><SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />My Wealth AI</SheetTitle></SheetHeader>
          <div className="mt-3 min-h-0 flex-1"><AssistantChat compact /></div>
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  )
}

export function useAssistant() {
  const v = useContext(Ctx)
  return v ?? { open: () => {} }
}
