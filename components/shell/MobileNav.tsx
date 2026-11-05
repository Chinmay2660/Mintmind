'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { DASHBOARD_NAV_MAIN, DASHBOARD_NAV_MORE, isDashboardNavActive } from '@/lib/constants/dashboardNav'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const moreActive = DASHBOARD_NAV_MORE.some((m) => isDashboardNavActive(pathname, m.path))

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar safe-area-inset-bottom md:hidden print:hidden"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch justify-around px-1">
        {DASHBOARD_NAV_MAIN.map((item) => {
          const active = isDashboardNavActive(pathname, item.path)
          const Icon = item.icon
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
              <span className="w-full truncate text-center">{item.name.split(' ')[0]}</span>
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
            <SheetHeader className="mb-3 text-left">
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2">
              {DASHBOARD_NAV_MORE.map((item) => {
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
