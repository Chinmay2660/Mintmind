'use client'

import { useSidebar } from '@/contexts/SidebarContext'
import { SIDEBAR_CLASS_COLLAPSED, SIDEBAR_CLASS_EXPANDED } from '@/lib/constants/sidebar'
import { cn } from '@/lib/utils'
import MobileBottomNav, { DesktopSidebar } from './MobileNavbar'

function DashboardMain({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      {children}
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar()

  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
      <div
        className={cn(
          'relative z-10 min-h-0 flex-1 overflow-hidden transition-[margin-left] duration-300 ease-in-out',
          isOpen ? SIDEBAR_CLASS_EXPANDED : SIDEBAR_CLASS_COLLAPSED
        )}
      >
        <DashboardMain>{children}</DashboardMain>
      </div>
    </>
  )
}
