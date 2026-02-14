'use client'
import React from 'react'
import { Bell, Search } from 'lucide-react'
import UserProfile from '@/components/UserProfile'
import { ThemeToggle } from '@/components/ThemeToggle'
import { motion } from 'framer-motion'

const DashboardHeader = () => {
    return (
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 safe-area-inset-top">
            <div className="flex items-center justify-between px-4 md:px-6 h-16">
                {/* Mobile: Search */}
                <div className="md:hidden flex-1">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
                        <Search className="w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="flex-1 bg-transparent border-0 outline-0 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Desktop: Empty space */}
                <div className="hidden md:block flex-1" />

                {/* Right side actions */}
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <UserProfile />
                </div>
            </div>
        </header>
    )
}

export default DashboardHeader
