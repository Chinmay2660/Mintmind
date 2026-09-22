'use client'

import React from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import UserProfile from '@/components/UserProfile'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PrivacyToggle } from '@/components/PrivacyToggle'
import Logo from '@/components/Logo'
import AppSearchTrigger from '@/components/AppSearchTrigger'
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

const DashboardHeader = () => {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border/50 bg-background/90 backdrop-blur-xl safe-area-inset-top">
      <div className="mx-auto flex h-14 max-w-[88rem] items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <Link href="/dashboard" className="inline-flex origin-left scale-90">
            <Logo compact />
          </Link>
          <AppSearchTrigger />
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
          <AppSearchTrigger />
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <DropdownMenu>
            <Tooltip content="Quick add" side="bottom">
              <span>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="hidden h-9 gap-1.5 rounded-full px-4 sm:inline-flex"
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

          <PrivacyToggle />
          <ThemeToggle />
          <UserProfile />
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
