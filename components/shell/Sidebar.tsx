'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, PanelLeftClose, PanelLeftOpen, Sparkles, Wallet } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { DASHBOARD_NAV_ALL, APP_NAME, isDashboardNavActive, type DashboardNavItem } from '@/lib/constants/dashboardNav'
import { cn } from '@/lib/utils'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useVisibleNav } from './FeatureGuard'
import { canStorePreferences } from '@/lib/consent'

const COLLAPSE_KEY = 'mm-sidebar-collapsed'

// the selected item: soft brand fill in the default style; the pressed lime pill (thin edge, small hard shadow) in Paper
const ACTIVE = 'bg-primary/10 font-semibold text-foreground paper:bg-primary paper:text-primary-foreground paper:border-[1.5px] paper:border-[hsl(var(--edge))] paper:shadow-[inset_0_1px_0_hsl(var(--hi)),1.5px_2.5px_0_0_hsl(var(--drop))] paper:font-bold'
const IDLE = 'text-foreground/80 hover:bg-muted hover:text-foreground'

/** One flat list, most-used first. Section labels are plain text (nothing collapses), Settings sits at the bottom. */
const SECTIONS: { label?: string; ids: number[] }[] = [
  { ids: [1, 7] },
  { label: 'Money', ids: [3, 5] },
  { label: 'Wealth', ids: [4, 2, 14, 15] },
  { label: 'More', ids: [6, 8, 9, 13] },
]
const SETTINGS_ID = 12

/**
 * The navigation itself. On a wide screen it sits in the sidebar (and can shrink to an icon rail);
 * on a phone or tablet the same content opens as a drawer from the menu button, with no collapse control.
 */
function NavPanel({ collapsed = false, drawer = false, onNavigate, onToggleRail }: { collapsed?: boolean; drawer?: boolean; onNavigate?: () => void; onToggleRail?: () => void }) {
  const pathname = usePathname()
  const { all } = useVisibleNav()
  const { isEnabled } = useFeatures()
  const byId = useMemo(() => new Map(all.map((i) => [i.id, i])), [all])
  const sections = SECTIONS.map((sec) => ({ ...sec, items: sec.ids.map((id) => byId.get(id)).filter(Boolean) as DashboardNavItem[] })).filter((sec) => sec.items.length)
  const settings = byId.get(SETTINGS_ID)
  const aiOn = isEnabled('ai_assistant')
  const aiActive = isDashboardNavActive(pathname, '/dashboard/ai')

  const row = (item: DashboardNavItem) => {
    const active = isDashboardNavActive(pathname, item.path)
    const Icon = item.icon
    return (
      <Link href={item.path} onClick={onNavigate} aria-current={active ? 'page' : undefined} title={collapsed ? item.name : undefined}
        className={cn('flex items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', 'py-2', active ? ACTIVE : IDLE, collapsed && 'mx-auto h-10 w-10 justify-center p-0')}>
        <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.9} aria-hidden />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.name}</span>}
      </Link>
    )
  }

  return (
    <>
      <div className={cn('flex h-16 shrink-0 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <span className={cn('flex items-center justify-center rounded-lg bg-primary text-primary-foreground', collapsed ? 'h-10 w-10' : 'h-9 w-9')}><Wallet className="h-5 w-5" strokeWidth={2} /></span>
          {!collapsed && <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>}
        </Link>
      </div>

      <nav aria-label="Modules" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {collapsed ? (
          // icon rail: every destination, flat
          <div className="space-y-1">
            {sections.flatMap((x) => x.items).map((i) => <Fragment key={i.id}>{row(i)}</Fragment>)}
            {aiOn && <Link href="/dashboard/ai" title="My Wealth AI" aria-label="My Wealth AI" className={cn('mx-auto flex h-10 w-10 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring', aiActive ? ACTIVE : IDLE)}><Sparkles className="h-[17px] w-[17px]" /></Link>}
          </div>
        ) : (
          <>
            {sections.map((sec, n) => (
              <div key={sec.label ?? 'main'} className={cn(n > 0 && 'mt-4')}>
                {sec.label && <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{sec.label}</p>}
                <ul className="space-y-0.5">
                  {sec.items.map((i) => <li key={i.id}>{row(i)}</li>)}
                  {n === 0 && aiOn && (
                    <li>
                      <Link href="/dashboard/ai" onClick={onNavigate} aria-current={aiActive ? 'page' : undefined} className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', aiActive ? ACTIVE : IDLE)}>
                        <Sparkles className="h-[16px] w-[16px] shrink-0" strokeWidth={1.9} /><span className="min-w-0 flex-1 truncate">Wealth AI</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border p-3">
        {settings && row(settings)}
        {!drawer && onToggleRail && (
          <button type="button" onClick={onToggleRail} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}
            className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', collapsed && 'mx-auto h-10 w-10 justify-center p-0')}>
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </>
  )
}

/** The wide-screen sidebar. */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1') } catch { /* storage blocked */ } }, [])
  const toggle = () => setCollapsed((c) => { try { if (canStorePreferences()) localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1') } catch { /* ignore */ } return !c })
  return (
    <aside aria-label="Primary" className={cn('hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex print:hidden', collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]')}>
      <NavPanel collapsed={collapsed} onToggleRail={toggle} />
    </aside>
  )
}

/** The menu button for phones and tablets. It opens the same navigation as a drawer, and a tap outside closes it. */
export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => { setOpen(false) }, [pathname])
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
        className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden print:hidden">
        <Menu className="h-[18px] w-[18px]" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-[86vw] max-w-[19rem] flex-col gap-0 bg-sidebar p-0 sm:max-w-[19rem] [&>button]:hidden">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <NavPanel drawer onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
