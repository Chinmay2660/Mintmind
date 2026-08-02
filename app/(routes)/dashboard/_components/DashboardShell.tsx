'use client'

import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'
import MobileNavbar, { DesktopSidebar } from './MobileNavbar'

function DashboardMain({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {children}
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar()

  return (
    <>
      <DesktopSidebar />
      <MobileNavbar />
      <div
        className={cn(
          'relative z-10 flex min-h-screen min-w-0 flex-col transition-[margin-left] duration-300 ease-in-out',
          isOpen ? 'md:ml-64' : 'md:ml-0'
        )}
      >
        <DashboardMain>{children}</DashboardMain>
      </div>
    </>
  )
}
