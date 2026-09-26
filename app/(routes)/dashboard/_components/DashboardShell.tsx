'use client'

import MobileBottomNav from './MobileNavbar'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileBottomNav />
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <div className="h-full min-h-0 overflow-hidden">{children}</div>
      </div>
    </>
  )
}
