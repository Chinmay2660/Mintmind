'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DASHBOARD_NAV_ALL, APP_NAME, isDashboardNavActive } from '@/lib/constants/dashboardNav'
import { cn } from '@/lib/utils'
import { useVisibleNav } from './FeatureGuard'

const KEY = 'mm-sidebar-collapsed'

export function Sidebar() {
  const pathname = usePathname()
  const { all: navItems } = useVisibleNav()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KEY) === '1')
    } catch {
      /* storage blocked */
    }
  }, [])

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !c
    })
  }

  return (
    <aside
      aria-label="Primary"
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex print:hidden',
        collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      <div className={cn('flex h-16 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <Link href="/dashboard" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" strokeWidth={2} />
          </span>
          {!collapsed && <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>}
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const active = isDashboardNavActive(pathname, item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.path}
              title={collapsed ? item.name : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                collapsed && 'justify-center px-0',
                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
