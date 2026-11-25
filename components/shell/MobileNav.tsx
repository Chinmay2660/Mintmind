'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, Sparkles } from 'lucide-react'
import { DASHBOARD_NAV_MAIN, DASHBOARD_NAV_MORE, OVERVIEW_DRILL_PATHS, isDashboardNavActive } from '@/lib/constants/dashboardNav'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useVisibleNav } from './FeatureGuard'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { NotificationsMenu } from './NotificationsMenu'

// One short word per tab. "Budget & Expenses" reads as "Expenses" because that is what people look for.
const tabLabel = (name: string) => (/transaction|expense/i.test(name) ? 'Spend' : name.split(' ')[0])

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  // On a phone the app opens on Transactions & Budgets (once per session); Overview is still one tap away.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('mm-landed')) return
      sessionStorage.setItem('mm-landed', '1')
      if (pathname === '/dashboard' && window.matchMedia('(max-width: 767px)').matches) router.replace('/dashboard/budget')
    } catch { /* storage blocked: stay where we are */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { main: navMain, more: navMore } = useVisibleNav()
  const aiOn = useFeatures().isEnabled('ai_assistant')
  const [open, setOpen] = useState(false)
  const moreActive = navMore.some((m) => isDashboardNavActive(pathname, m.path))

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar safe-area-inset-bottom md:hidden print:hidden"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch justify-around px-1">
        {navMain.map((item) => {
          // the pages the Overview's Assets and Liabilities tabs open still belong to the Overview tab
          const active = isDashboardNavActive(pathname, item.path) || (item.id === 1 && OVERVIEW_DRILL_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')))
          const Icon = item.icon
          // Spend is the main job on a phone, so it is a raised round button in the middle of the bar
          if (item.id === 7) {
            return (
              <Link key={item.id} href={item.path} aria-current={active ? 'page' : undefined} aria-label="Spend: transactions and budgets"
                className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1 pb-1.5 text-[11px] font-semibold outline-none">
                <span className={cn('-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-sidebar transition-transform group-active:scale-95 group-focus-visible:ring-ring', active && 'ring-primary/30')}>
                  <Icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <span className={cn('w-full truncate text-center', active ? 'text-primary' : 'text-foreground')}>{tabLabel(item.name)}</span>
              </Link>
            )
          }
          return (
            <Link
              key={item.id}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none focus-visible:bg-muted',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="w-full truncate text-center">{tabLabel(item.name)}</span>
            </Link>
          )
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none focus-visible:bg-muted',
                moreActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card pb-8">
            <SheetHeader className="mb-3 flex-row items-center justify-between space-y-0 text-left">
              <SheetTitle>More</SheetTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Notifications
                <NotificationsMenu />
              </div>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2">
              {[...navMore.filter((i) => i.id !== 12), ...(aiOn ? [{ id: 99, name: 'Wealth AI', icon: Sparkles, path: '/dashboard/ai' }] : []), ...navMore.filter((i) => i.id === 12)].map((item) => {
                const Icon = item.icon
                const active = isDashboardNavActive(pathname, item.path)
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-sm font-medium',
                      active ? 'border-primary/40 bg-accent text-accent-foreground' : 'bg-card text-foreground'
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
