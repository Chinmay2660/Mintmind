'use client'

import React from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import UserProfile from '@/components/UserProfile'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PrivacyToggle } from '@/components/PrivacyToggle'
import Logo from '@/components/Logo'
import AppSearchTrigger from '@/components/AppSearchTrigger'
import { DesktopNavMenu } from './DesktopNavMenu'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const QUICK_ACTIONS = [
  { label: 'Expense', href: '/dashboard/transactions/new?type=expense' },
  { label: 'Income', href: '/dashboard/transactions/new?type=income' },
  { label: 'Transfer', href: '/dashboard/transactions/new?type=transfer' },
  { label: 'Investment', href: '/dashboard/investments/new' },
]

// ponytail: the 8 menus fit inline only from xl (~1100px needed); below that they get their own row.
const DashboardHeader = () => {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl safe-area-inset-top">
      <div className="mx-auto flex h-16 max-w-[88rem] items-center gap-3 px-4 md:px-6 lg:px-8">
        <Link href="/dashboard" className="inline-flex shrink-0 origin-left scale-90 md:hidden">
          <Logo compact />
        </Link>
        <Link href="/dashboard" className="hidden shrink-0 md:inline-flex">
          <Logo />
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <DesktopNavMenu className="hidden xl:flex" />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <AppSearchTrigger />
          <PrivacyToggle />
          <ThemeToggle />
          <DropdownMenu>
            <Tooltip content="Quick add" side="bottom">
              <span>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="mx-1 hidden h-9 gap-1.5 rounded-full px-4 sm:inline-flex"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                    <span className="hidden md:inline">Add</span>
                  </Button>
                </DropdownMenuTrigger>
              </span>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/60 p-1.5">
              {QUICK_ACTIONS.map((action) => (
                <DropdownMenuItem key={action.label} asChild className="rounded-xl px-3 py-2.5">
                  <Link href={action.href}>{action.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <UserProfile />
        </div>
      </div>

      <div className="hidden px-4 pb-3 md:block md:px-6 lg:px-8 xl:hidden">
        <div className="mx-auto max-w-[88rem]">
          <DesktopNavMenu />
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
