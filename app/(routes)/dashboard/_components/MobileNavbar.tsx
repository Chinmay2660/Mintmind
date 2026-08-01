'use client'
import React, { useState } from 'react'
import { Menu, PanelLeftClose } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import UserProfile from '@/components/UserProfile'
import { DASHBOARD_NAV_MAIN, DASHBOARD_NAV_MORE, DASHBOARD_NAV_ALL } from '@/lib/constants/dashboardNav'
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
    const pathname = usePathname()
    const [moreMenuOpen, setMoreMenuOpen] = useState(false)
    const { isOpen, toggle } = useSidebar()

    const mainMenu = DASHBOARD_NAV_MAIN.map((menu) => ({
        ...menu,
        active: pathname === menu.path,
    }))

    const moreMenu = DASHBOARD_NAV_MORE.map((menu) => ({
        ...menu,
        active: pathname === menu.path,
    }))

    const allMenu = DASHBOARD_NAV_ALL.map((menu) => ({
        ...menu,
        active: pathname === menu.path,
    }))

    return (
        <>
            {/* Mobile Bottom Tab Bar - Only 3 main buttons + More */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 liquid-glass border-t border-white/20 dark:border-white/10 safe-area-inset-bottom">
                <div className="flex items-center justify-around h-16 px-2">
                    {mainMenu.map((menu) => {
                        const Icon = menu.icon
                        return (
                            <Link
                                key={menu.id}
                                href={menu.path}
                                className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0 relative"
                                onClick={() => setMoreMenuOpen(false)}
                            >
                                {menu.active && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-b-full"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <div className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                                    menu.active ? 'text-primary' : 'text-muted-foreground'
                                }`}>
                                    <div className={`p-2 rounded-xl transition-colors ${
                                        menu.active ? 'bg-primary/15' : ''
                                    }`}>
                                        <Icon className={`w-5 h-5 ${menu.active ? 'text-primary' : ''}`} />
                                    </div>
                                    <span className={`text-[10px] font-medium truncate w-full text-center ${
                                        menu.active ? 'text-primary' : 'text-muted-foreground'
                                    }`}>
                                        {menu.name}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                    
                    {/* More Menu Button - Hamburger Icon */}
                    <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
                        <SheetTrigger asChild>
                            <button className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0 relative">
                                {moreMenu.some(m => m.active) && (
                                    <motion.div
                                        layoutId="activeTabMore"
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-b-full"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <div className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                                    moreMenu.some(m => m.active) ? 'text-primary' : 'text-muted-foreground'
                                }`}>
                                    <div className={`p-2 rounded-xl transition-colors ${
                                        moreMenu.some(m => m.active) ? 'bg-primary/15' : ''
                                    }`}>
                                        <Menu className={`w-5 h-5 ${moreMenu.some(m => m.active) ? 'text-primary' : ''}`} />
                                    </div>
                                    <span className={`text-[10px] font-medium truncate w-full text-center ${
                                        moreMenu.some(m => m.active) ? 'text-primary' : 'text-muted-foreground'
                                    }`}>
                                        More
                                    </span>
                                </div>
                            </button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[65vh] rounded-t-3xl pb-8">
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-left text-2xl font-bold text-foreground">
                                    More Options
                                </SheetTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Access additional features and settings
                                </p>
                            </SheetHeader>
                            <div className="space-y-2">
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

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    'sticky top-0 z-40 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-white/20 liquid-glass transition-[width] duration-300 ease-in-out dark:border-white/10 md:flex',
                    isOpen ? 'w-64' : 'w-0 border-r-0'
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
                            onClick={toggle}
                            aria-label="Close sidebar"
                        >
                            <PanelLeftClose className="h-5 w-5" />
                        </Button>
                    </div>
                    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                        {allMenu.map((menu) => {
                            const Icon = menu.icon
                            return (
                                <Link
                                    key={menu.id}
                                    href={menu.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        menu.active
                                            ? 'bg-primary/15 text-primary shadow-sm'
                                            : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium">{menu.name}</span>
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="border-t border-white/20 p-4 dark:border-white/10">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <UserProfile />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}

export default MobileNavbar
