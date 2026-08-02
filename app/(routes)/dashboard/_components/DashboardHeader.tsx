'use client'
import React from 'react'
import Link from 'next/link'
import { PanelLeft } from 'lucide-react'
import UserProfile from '@/components/UserProfile'
import { ThemeToggle } from '@/components/ThemeToggle'
import Logo from '@/components/Logo'
import AppSearchTrigger from '@/components/AppSearchTrigger'
import { useSidebar } from '@/contexts/SidebarContext'
import { Button } from '@/components/ui/button'

const DashboardHeader = () => {
    const { isOpen, open } = useSidebar()

    return (
        <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur-xl border-b border-border safe-area-inset-top">
            <div className="relative flex h-14 items-center justify-between gap-2 px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-2">
                    {!isOpen && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="hidden shrink-0 md:inline-flex"
                            onClick={open}
                            aria-label="Open sidebar"
                        >
                            <PanelLeft className="h-5 w-5" />
                        </Button>
                    )}

                    <Link href="/dashboard" className="inline-flex scale-90 origin-left md:hidden">
                        <Logo />
                    </Link>
                </div>

                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center md:static md:left-auto md:top-auto md:translate-x-0 md:translate-y-0 md:flex-1 md:justify-start">
                    <AppSearchTrigger />
                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <UserProfile />
                </div>
            </div>
        </header>
    )
}

export default DashboardHeader
