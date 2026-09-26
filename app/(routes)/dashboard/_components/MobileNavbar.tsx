'use client'

import React, { useState } from 'react'
import { Menu, Plus } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DASHBOARD_NAV_MAIN,
  DASHBOARD_NAV_MORE,
  DASHBOARD_NAV_SECTIONS,
  isDashboardNavActive,
} from '@/lib/constants/dashboardNav'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type NavMenu = {
  id: number
  name: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  path: string
  active: boolean
}

function NavLink({ menu, onNavigate }: { menu: NavMenu; onNavigate?: () => void }) {
  const Icon = menu.icon

  return (
    <Link
      href={menu.path}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-colors',
        menu.active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted/40'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          menu.active ? 'bg-primary/15 text-primary' : 'bg-muted/40'
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
      <span className="flex-1 text-sm font-medium">{menu.name}</span>
    </Link>
  )
}

function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const mainMenu = DASHBOARD_NAV_MAIN.map((menu) => ({
    ...menu,
    active: isDashboardNavActive(pathname, menu.path),
  }))

  const moreMenu = DASHBOARD_NAV_MORE.map((menu) => ({
    ...menu,
    active: isDashboardNavActive(pathname, menu.path),
  }))

  const moreSections = DASHBOARD_NAV_SECTIONS.filter((s) => s.id !== 'overview')

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/92 backdrop-blur-xl safe-area-inset-bottom md:hidden"
      >
        <div className="relative mx-auto flex h-[4.25rem] max-w-lg items-center justify-around px-2">
          {mainMenu.map((menu) => {
            const Icon = menu.icon
            return (
              <Link
                key={menu.id}
                href={menu.path}
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pb-1 pt-2 transition-colors',
                  menu.active ? 'nav-tab-active text-primary' : 'text-muted-foreground'
                )}
                onClick={() => setMoreMenuOpen(false)}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={menu.active ? 2.25 : 1.75} />
                <span className={cn(
                  'w-full truncate text-center text-[10px]',
                  menu.active ? 'font-semibold' : 'font-medium'
                )}>
                  {menu.name}
                </span>
              </Link>
            )
          })}

          <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1',
                  moreMenu.some((m) => m.active) ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Menu className="h-[22px] w-[22px]" strokeWidth={1.75} />
                <span className="w-full truncate text-center text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-[1.75rem] border-t border-border bg-card safe-area-inset-bottom pb-8"
            >
              <SheetHeader className="mb-4 space-y-1 text-left">
                <SheetTitle className="text-left text-lg font-semibold">Explore</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  Net worth, expenses, vault & more
                </p>
              </SheetHeader>
              <div className="space-y-5">
                {moreSections.map((section) => (
                  <div key={section.id}>
                    <p className="mm-section-title mb-2 px-1">{section.label}</p>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.id}
                          menu={{
                            ...item,
                            active: isDashboardNavActive(pathname, item.path),
                          }}
                          onNavigate={() => setMoreMenuOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <Tooltip content="Add transaction" side="left">
        <button
          type="button"
          onClick={() => router.push('/dashboard/transactions/new?type=expense')}
          className="fixed right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-all active:scale-95 hover:shadow-[0_8px_32px_hsl(var(--primary)/0.35)] md:hidden mobile-fab-bottom"
        >
          <Plus className="h-6 w-6" strokeWidth={2} />
        </button>
      </Tooltip>
    </>
  )
}

export { MobileBottomNav }
export default MobileBottomNav
