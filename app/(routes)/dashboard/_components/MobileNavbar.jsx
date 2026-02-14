'use client'
import React, { useState } from 'react'
import { LayoutDashboard, Wallet, ReceiptText, TrendingUp, PiggyBank, Target, DollarSign, Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import UserProfile from '@/components/UserProfile'
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

    // Main 3 buttons (most frequently used)
    const mainMenu = [
        {
            id: 1,
            name: 'Home',
            icon: LayoutDashboard,
            path: '/dashboard',
            active: pathname === '/dashboard'
        },
        {
            id: 2,
            name: 'Accounts',
            icon: Wallet,
            path: '/dashboard/accounts',
            active: pathname === '/dashboard/accounts'
        },
        {
            id: 3,
            name: 'Transactions',
            icon: ReceiptText,
            path: '/dashboard/transactions',
            active: pathname === '/dashboard/transactions'
        },
    ]

    // Additional menu items (in "More" menu)
    const moreMenu = [
        {
            id: 4,
            name: 'Investments',
            icon: TrendingUp,
            path: '/dashboard/investments',
            active: pathname === '/dashboard/investments'
        },
        {
            id: 5,
            name: 'Categories',
            icon: PiggyBank,
            path: '/dashboard/categories',
            active: pathname === '/dashboard/categories'
        },
        {
            id: 6,
            name: 'Budgets',
            icon: Target,
            path: '/dashboard/budgets',
            active: pathname === '/dashboard/budgets'
        },
        {
            id: 7,
            name: 'Salary',
            icon: DollarSign,
            path: '/dashboard/salary-recurring',
            active: pathname === '/dashboard/salary-recurring'
        },
    ]

    // Full menu for desktop
    const allMenu = [...mainMenu, ...moreMenu]

    return (
        <>
            {/* Mobile Bottom Tab Bar - Only 3 main buttons + More */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
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
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <div className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                                    menu.active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    <div className={`p-2 rounded-xl transition-colors ${
                                        menu.active ? 'bg-primary/10' : ''
                                    }`}>
                                        <Icon className={`w-5 h-5 ${menu.active ? 'text-primary' : ''}`} />
                                    </div>
                                    <span className={`text-[10px] font-medium truncate w-full text-center ${
                                        menu.active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
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
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <div className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                                    moreMenu.some(m => m.active) ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    <div className={`p-2 rounded-xl transition-colors ${
                                        moreMenu.some(m => m.active) ? 'bg-primary/10' : ''
                                    }`}>
                                        <Menu className={`w-5 h-5 ${moreMenu.some(m => m.active) ? 'text-primary' : ''}`} />
                                    </div>
                                    <span className={`text-[10px] font-medium truncate w-full text-center ${
                                        moreMenu.some(m => m.active) ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                        More
                                    </span>
                                </div>
                            </button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[65vh] rounded-t-3xl pb-8">
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-left text-2xl font-bold text-gray-900 dark:text-white">
                                    More Options
                                </SheetTitle>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                                                    ? 'bg-primary/10 text-primary border-l-4 border-primary'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg ${
                                                menu.active ? 'bg-primary/20' : 'bg-gray-100 dark:bg-gray-800'
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
            <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <Link href="/">
                        <h1 className="text-2xl font-bold gradient-text cursor-pointer hover:opacity-80 transition-opacity">Mintmind</h1>
                    </Link>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {allMenu.map((menu) => {
                        const Icon = menu.icon
                        return (
                            <Link
                                key={menu.id}
                                href={menu.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                    menu.active
                                        ? 'bg-primary/10 text-primary shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium">{menu.name}</span>
                            </Link>
                        )
                    })}
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <UserProfile />
                    </div>
                </div>
            </aside>
        </>
    )
}

export default MobileNavbar
