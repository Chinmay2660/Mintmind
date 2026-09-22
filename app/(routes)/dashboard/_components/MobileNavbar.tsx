'use client'

import React, { useState } from 'react'
import { Menu, PanelLeft, PanelLeftClose, Plus } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import UserProfile from '@/components/UserProfile'
import {
  DASHBOARD_NAV_MAIN,
  DASHBOARD_NAV_MORE,
  DASHBOARD_NAV_SECTIONS,
  isDashboardNavActive,
} from '@/lib/constants/dashboardNav'
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from '@/lib/constants/sidebar'
import Logo from '@/components/Logo'
import { useSidebar } from '@/contexts/SidebarContext'
import { Button } from '@/components/ui/button'
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

function NavLink({
  menu,
  onNavigate,
  variant = 'sidebar',
  collapsed = false,
}: {
  menu: NavMenu
  onNavigate?: () => void
  variant?: 'sidebar' | 'sheet'
  collapsed?: boolean
}) {
  const Icon = menu.icon

  if (variant === 'sheet') {
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

  if (collapsed) {
    const link = (
      <Link
        href={menu.path}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          menu.active
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={menu.active ? 2 : 1.75} />
      </Link>
    )

    return (
      <Tooltip content={menu.name} side="right">
        {link}
      </Tooltip>
    )
  }

  return (
    <Link
      href={menu.path}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors',
        menu.active
          ? 'nav-item-active'
          : 'text-muted-foreground hover:bg-muted/30'
      )}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={menu.active ? 2 : 1.75} />
      <span className="truncate">{menu.name}</span>
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
                  Investments, credit, reports & more
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
                          variant="sheet"
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

function DesktopSidebar() {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()
  const flatNav = DASHBOARD_NAV_SECTIONS.flatMap((section) => section.items)

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-border/60 bg-card/95 backdrop-blur-xl transition-[width] duration-300 ease-in-out md:flex"
      style={{ width: isOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
    >
      <div
        className="flex h-full flex-col"
        style={{ width: isOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-border/60',
            isOpen ? 'justify-between px-4' : 'justify-center px-2'
          )}
        >
          {isOpen ? (
            <>
              <Link href="/dashboard" className="min-w-0">
                <Logo />
              </Link>
              <Tooltip content="Collapse sidebar" side="right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl"
                  onClick={toggle}
                >
                  <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </Button>
              </Tooltip>
            </>
          ) : (
            <Tooltip content="Mintmind" side="right">
              <Link href="/dashboard">
                <Logo compact />
              </Link>
            </Tooltip>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 overflow-y-auto py-3',
            isOpen ? 'space-y-0.5 px-2.5' : 'flex flex-col items-center gap-1 px-2'
          )}
        >
          {isOpen
            ? DASHBOARD_NAV_SECTIONS.map((section) => (
                <div key={section.id}>
                  <p className="nav-section-label">{section.label}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.id}
                        menu={{
                          ...item,
                          active: isDashboardNavActive(pathname, item.path),
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            : flatNav.map((item) => (
                <NavLink
                  key={item.id}
                  menu={{
                    ...item,
                    active: isDashboardNavActive(pathname, item.path),
                  }}
                  collapsed
                />
              ))}
        </nav>

        <div
          className={cn(
            'shrink-0 border-t border-border/60 py-3',
            isOpen ? 'px-3' : 'flex flex-col items-center gap-2 px-2'
          )}
        >
          {!isOpen && (
            <Tooltip content="Expand sidebar" side="right">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={toggle}
              >
                <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </Button>
            </Tooltip>
          )}
          <UserProfile showName={isOpen} compact={!isOpen} tooltip={!isOpen} />
        </div>
      </div>
    </aside>
  )
}

export { DesktopSidebar, MobileBottomNav }
export default MobileBottomNav
