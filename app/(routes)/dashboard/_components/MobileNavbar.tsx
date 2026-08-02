'use client'
import React, { useState } from 'react'
import { Menu, PanelLeftClose } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import UserProfile from '@/components/UserProfile'
import {
  DASHBOARD_NAV_MAIN,
  DASHBOARD_NAV_MORE,
  DASHBOARD_NAV_ALL,
  isDashboardNavActive,
} from '@/lib/constants/dashboardNav'
import Logo from '@/components/Logo'
import { useSidebar } from '@/contexts/SidebarContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const MobileNavbar = () => {
    return <MobileBottomNav />
}

function MobileBottomNav() {
    const pathname = usePathname()
    const [moreMenuOpen, setMoreMenuOpen] = useState(false)
    const mainMenu = DASHBOARD_NAV_MAIN.map((menu) => ({
        ...menu,
        active: isDashboardNavActive(pathname, menu.path),
    }))

    const moreMenu = DASHBOARD_NAV_MORE.map((menu) => ({
        ...menu,
        active: isDashboardNavActive(pathname, menu.path),
    }))

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
                <div className="flex items-stretch justify-around px-1 h-16">
                    {mainMenu.map((menu) => {
                        const Icon = menu.icon
                        return (
                            <Link
                                key={menu.id}
                                href={menu.path}
                                className={cn(
                                    'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 py-1',
                                    menu.active
                                        ? 'border-t-2 border-primary text-primary -mt-px'
                                        : 'border-t-2 border-transparent text-muted-foreground'
                                )}
                                onClick={() => setMoreMenuOpen(false)}
                            >
                                <div className={cn(
                                    'p-1.5 rounded-xl transition-colors',
                                    menu.active && 'bg-primary/15'
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-medium truncate w-full text-center">
                                    {menu.name}
                                </span>
                            </Link>
                        )
                    })}
                    
                    {/* More Menu Button - Hamburger Icon */}
                    <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 py-1',
                                    moreMenu.some(m => m.active)
                                        ? 'border-t-2 border-primary text-primary -mt-px'
                                        : 'border-t-2 border-transparent text-muted-foreground'
                                )}
                            >
                                <div className={cn(
                                    'p-1.5 rounded-xl transition-colors',
                                    moreMenu.some(m => m.active) && 'bg-primary/15'
                                )}>
                                    <Menu className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-medium truncate w-full text-center">
                                    More
                                </span>
                            </button>
                        </SheetTrigger>
                        <SheetContent
                            side="bottom"
                            className="flex max-h-[85dvh] flex-col rounded-t-3xl safe-area-inset-bottom pb-8"
                        >
                            <SheetHeader className="mb-6 shrink-0">
                                <SheetTitle className="text-left text-2xl font-bold text-foreground">
                                    More Options
                                </SheetTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Access additional features and settings
                                </p>
                            </SheetHeader>
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                                {moreMenu.map((menu) => {
                                    const Icon = menu.icon
                                    return (
                                        <Link
                                            key={menu.id}
                                            href={menu.path}
                                            onClick={() => setMoreMenuOpen(false)}
                                            className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all ${
                                                menu.active
                                                    ? 'bg-primary/15 text-primary border-l-4 border-primary'
                                                    : 'text-muted-foreground hover:bg-muted border-l-4 border-transparent'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg ${
                                                menu.active ? 'bg-primary/20' : 'surface-inner'
                                            }`}>
                                                <Icon className={`w-6 h-6 ${menu.active ? 'text-primary' : ''}`} />
                                            </div>
                                            <span className="font-medium text-base flex-1">{menu.name}</span>
                                            {menu.active && (
                                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                            )}
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

function DesktopSidebar() {
    const pathname = usePathname()
    const { isOpen, close } = useSidebar()
    const allMenu = DASHBOARD_NAV_ALL.map((menu) => ({
        ...menu,
        active: isDashboardNavActive(pathname, menu.path),
    }))

    return (
        <aside
            className={cn(
                'fixed inset-y-0 left-0 z-40 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-white/20 bg-background/95 backdrop-blur-xl transition-[width] duration-300 ease-in-out dark:border-white/10 md:flex',
                isOpen ? 'w-64' : 'w-0 border-r-0 pointer-events-none'
            )}
        >
            <div className="flex h-full w-64 flex-col">
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/20 px-4 dark:border-white/10">
                    <Link href="/dashboard" className="min-w-0">
                        <Logo />
                    </Link>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={close}
                        aria-label="Close sidebar"
                    >
                        <PanelLeftClose className="h-5 w-5" />
                    </Button>
                </div>
                <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
                    {allMenu.map((menu) => {
                        const Icon = menu.icon
                        return (
                            <Link
                                key={menu.id}
                                href={menu.path}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2 transition-all',
                                    menu.active
                                        ? 'bg-primary/15 text-primary shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted'
                                )}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                <span className="font-medium">{menu.name}</span>
                            </Link>
                        )
                    })}
                </nav>
                <div className="shrink-0 border-t border-white/20 px-3 py-2 dark:border-white/10">
                    <UserProfile showName />
                </div>
            </div>
        </aside>
    )
}

export { DesktopSidebar, MobileBottomNav }
export default MobileNavbar
