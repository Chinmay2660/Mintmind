'use client'
import React from 'react'
import Link from 'next/link'
import { PanelLeft } from 'lucide-react'
import UserProfile from '@/components/UserProfile'
import { ThemeToggle } from '@/components/ThemeToggle'
import Logo from '@/components/Logo'
import { useSidebar } from '@/contexts/SidebarContext'
import { Button } from '@/components/ui/button'

const DashboardHeader = () => {
    const { isOpen, toggle } = useSidebar()

    return (
        <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-lg shadow-primary/5 safe-area-inset-top">
            <div className="flex h-14 items-center gap-2 px-4 md:px-6">
                {!isOpen && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="hidden md:inline-flex shrink-0"
                        onClick={toggle}
                        aria-label="Open sidebar"
                    >
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                )}

                <div className="min-w-0 flex-1 md:hidden">
                    <Link href="/dashboard" className="inline-block scale-90 origin-left">
                        <Logo />
                    </Link>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <ThemeToggle />
                    <UserProfile />
                </div>
            </div>
        </header>
    )
}

export default DashboardHeader
