'use client'

import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import UserProfile from '@/components/UserProfile'
import { ThemeToggle } from '@/components/ThemeToggle'
import AppSearchTrigger from '@/components/AppSearchTrigger'
import { NotificationsMenu } from './NotificationsMenu'
import { Button } from '@/components/ui/button'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { usePathname } from 'next/navigation'
import { getDashboardPageTitle } from '@/lib/constants/dashboardNav'
import { Wallet } from 'lucide-react'
import Link from 'next/link'

export function TopBar() {
  const { isDemo, resetDemo } = useWealth()
  const { privacyMode, togglePrivacyMode } = usePrivacyMode()
  const pathname = usePathname()

  return (
    <header className="print:hidden sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur safe-area-inset-top md:px-6">
      <Link href="/dashboard" className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden" aria-label="Mintmind home">
        <Wallet className="h-4 w-4" />
      </Link>
      <h1 className="min-w-0 truncate text-base font-semibold md:text-lg">{getDashboardPageTitle(pathname)}</h1>

      {isDemo && (
        <div className="ml-2 flex items-center gap-1.5">
          <span className="rounded-md bg-warning/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-warning">Demo mode</span>
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
        <AppSearchTrigger />
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={togglePrivacyMode} aria-label={privacyMode ? 'Show balances' : 'Hide balances'} aria-pressed={privacyMode}>
          {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <ThemeToggle />
        <NotificationsMenu />
        <UserProfile />
      </div>
    </header>
  )
}
