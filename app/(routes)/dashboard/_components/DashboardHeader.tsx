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
            <div className="flex h-14 items-center justify-between gap-2 px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-2 lg:hidden">
                    <Link href="/dashboard" className="inline-flex scale-90 origin-left">
                        <Logo compact />
                    </Link>
                    <AppSearchTrigger />
                </div>

                <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
                    {!isOpen && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={open}
                            aria-label="Open sidebar"
                        >
                            <PanelLeft className="h-5 w-5" />
                        </Button>
                    )}

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
