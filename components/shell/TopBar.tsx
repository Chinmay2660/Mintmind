'use client'

import { Eye, EyeOff, Keyboard, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import UserProfile from '@/components/UserProfile'
import { ThemeToggle } from '@/components/ThemeToggle'
import AppSearchTrigger from '@/components/AppSearchTrigger'
import { QuickActions } from '@/components/shell/QuickActions'
import { SHOW_SHORTCUTS_EVENT } from '@/components/shell/Shortcuts'
import { NotificationsMenu } from './NotificationsMenu'
import { Button } from '@/components/ui/button'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { Breadcrumbs } from '@/components/shell/Breadcrumbs'
import { Wallet } from 'lucide-react'
import Link from 'next/link'

export function TopBar() {
  const { isDemo, resetDemo } = useWealth()
  const { privacyMode, togglePrivacyMode } = usePrivacyMode()

  return (
    <header className="print:hidden sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur safe-area-inset-top md:px-6">
      <Link href="/dashboard" className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden" aria-label="Mintmind home">
        <Wallet className="h-4 w-4" />
      </Link>
      <Breadcrumbs />

      {isDemo && (
        <div className="ml-2 hidden items-center gap-1.5 min-[420px]:flex">
          <span className="shrink-0 whitespace-nowrap rounded-md bg-warning/15 px-2 py-1 text-[11px] font-bold tracking-wide text-warning"><span className="sm:hidden">Demo</span><span className="max-sm:hidden">Demo mode</span></span>
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-8 gap-1.5 px-2 text-xs sm:inline-flex"
            onClick={async () => {
              await resetDemo()
              toast.success('Demo data reset')
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset demo data
          </Button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        <QuickActions />
        <Button variant="ghost" size="icon" className="hidden h-9 w-9 rounded-full md:inline-flex" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={() => window.dispatchEvent(new Event(SHOW_SHORTCUTS_EVENT))}><Keyboard className="h-4 w-4" /></Button>
        <AppSearchTrigger />
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={togglePrivacyMode} aria-label={privacyMode ? 'Show balances' : 'Hide balances'} aria-pressed={privacyMode}>
          {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        {/* on a phone, theme, notifications and profile live in More / Settings */}
        <div className="hidden items-center gap-0.5 md:flex">
          <ThemeToggle />
          <NotificationsMenu />
          <UserProfile />
        </div>
      </div>
    </header>
  )
}
