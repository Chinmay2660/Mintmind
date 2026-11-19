'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckCircle2, ChevronRight, FileText, Folder, Menu, PanelLeftClose, PanelLeftOpen, Sparkles, Wallet } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { DASHBOARD_NAV_ALL, APP_NAME, isDashboardNavActive, type DashboardNavItem } from '@/lib/constants/dashboardNav'
import { cn } from '@/lib/utils'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useVisibleNav } from './FeatureGuard'
import { canStorePreferences } from '@/lib/consent'

const COLLAPSE_KEY = 'mm-sidebar-collapsed'
const OPEN_KEY = 'mm-sidebar-open'

// the selected item: soft brand fill in the default style; the pressed lime pill (thin edge, small hard shadow) in Paper
const ACTIVE = 'bg-accent text-accent-foreground paper:bg-primary paper:text-primary-foreground paper:border-[1.5px] paper:border-[hsl(var(--edge))] paper:shadow-[inset_0_1px_0_hsl(var(--hi)),1.5px_2.5px_0_0_hsl(var(--drop))] paper:font-bold'
const IDLE = 'text-muted-foreground hover:bg-muted hover:text-foreground'

/** Folders for the module tree. Short names, so nothing is cut off. Each takes a semantic colour from the chart palette. */
const GROUPS: { key: string; label: string; tone: string; ids: number[] }[] = [
  { key: 'banking', label: 'Banking', tone: 'text-[hsl(208_68%_46%)]', ids: [3, 5] },
  { key: 'invest', label: 'Investing', tone: 'text-[hsl(254_42%_56%)]', ids: [4, 6] },
  { key: 'spending', label: 'Spending', tone: 'text-[hsl(21_77%_55%)]', ids: [7, 13] },
  { key: 'people', label: 'People', tone: 'text-[hsl(173_59%_38%)]', ids: [8, 9] },
]
const TOP_IDS = [1, 2, 12]

/**
 * The navigation itself. On a wide screen it sits in the sidebar (and can shrink to an icon rail);
 * on a phone or tablet the same content opens as a drawer from the menu button, with no collapse control.
 */
function NavPanel({ collapsed = false, drawer = false, onNavigate, onToggleRail }: { collapsed?: boolean; drawer?: boolean; onNavigate?: () => void; onToggleRail?: () => void }) {
  const pathname = usePathname()
  const { all } = useVisibleNav()
  const { isEnabled } = useFeatures()
  const { data } = useWealth()
  const [open, setOpen] = useState<Record<string, boolean> | null>(null)

  useEffect(() => { try { setOpen(JSON.parse(localStorage.getItem(OPEN_KEY) || 'null') || {}) } catch { setOpen({}) } }, [])

  const byId = useMemo(() => new Map(all.map((i) => [i.id, i])), [all])
  const top = TOP_IDS.map((id) => byId.get(id)).filter(Boolean) as DashboardNavItem[]
  const groups = GROUPS.map((g) => ({ ...g, items: g.ids.map((id) => byId.get(id)).filter(Boolean) as DashboardNavItem[] })).filter((g) => g.items.length)
  const moduleCount = groups.reduce((n, g) => n + g.items.length, 0)

  // a folder is open if the user opened it, or if it holds the page they are on
  const isOpen = (g: (typeof groups)[number]) => (open?.[g.key] ?? false) || g.items.some((i) => isDashboardNavActive(pathname, i.path))
  const setFolder = (g: (typeof groups)[number], v: boolean) => setOpen((o) => {
    const next = { ...(o ?? {}), [g.key]: v }
    try { if (canStorePreferences()) localStorage.setItem(OPEN_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })

  // how much of the app has something in it: real counts, nothing assumed
  const done: Record<number, boolean> = {
    3: data.bankAccounts.length > 0, 4: data.funds.length > 0, 5: data.cards.length > 0, 6: data.policies.length > 0,
    7: data.expenses.length > 0, 13: data.balanceHistory.length > 1, 8: data.members.length > 1, 9: data.meta.some((m: any) => m.key === 'vault'),
  }
  const doneTotal = groups.reduce((n, g) => n + g.items.filter((i) => done[i.id]).length, 0)
  const aiOn = isEnabled('ai_assistant')
  const aiActive = isDashboardNavActive(pathname, '/dashboard/ai')

  const row = (item: DashboardNavItem, nested?: boolean) => {
    const active = isDashboardNavActive(pathname, item.path)
    const ready = !!done[item.id]
    const Icon = nested ? (ready ? CheckCircle2 : FileText) : item.icon
    return (
      <Link href={item.path} onClick={onNavigate} aria-current={active ? 'page' : undefined} title={collapsed ? item.name : undefined}
        className={cn('flex items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', nested ? 'py-1.5' : 'py-2', active ? ACTIVE : IDLE, collapsed && 'justify-center px-0 py-2.5')}>
        <Icon className={cn('h-[16px] w-[16px] shrink-0', nested && ready && !active && 'text-success')} strokeWidth={1.9} aria-hidden />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.name}</span>}
        {nested && !collapsed && <span className="sr-only">{ready ? ', set up' : ', nothing added yet'}</span>}
      </Link>
    )
  }

  return (
    <>
      <div className={cn('flex h-16 shrink-0 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-5 w-5" strokeWidth={2} /></span>
          {!collapsed && <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>}
        </Link>
      </div>

      <nav aria-label="Modules" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {collapsed ? (
          // icon rail: every destination, flat
          <div className="space-y-1">
            {[...top, ...groups.flatMap((g) => g.items)].map((i) => <Fragment key={i.id}>{row(i)}</Fragment>)}
            {aiOn && <Link href="/dashboard/ai" title="My Wealth AI" aria-label="My Wealth AI" className={cn('flex items-center justify-center rounded-lg py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring', aiActive ? ACTIVE : IDLE)}><Sparkles className="h-[17px] w-[17px]" /></Link>}
          </div>
        ) : (
          <>
            {/* the main places: one per line, full names */}
            <div className="space-y-1">
              {top.map((i) => <Fragment key={i.id}>{row(i)}</Fragment>)}
              {aiOn && (
                <Link href="/dashboard/ai" onClick={onNavigate} aria-current={aiActive ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', aiActive ? ACTIVE : IDLE)}>
                  <Sparkles className="h-[17px] w-[17px] shrink-0" strokeWidth={1.9} /><span className="min-w-0 flex-1 truncate">Wealth AI</span>
                </Link>
              )}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-center gap-2 text-sm font-bold"><Folder className="h-[18px] w-[18px] fill-current" aria-hidden />Your money</span>
                <span className="text-xs tabular-nums text-muted-foreground">{moduleCount} modules</span>
              </div>
              <ul className="space-y-0.5">
                {groups.map((g) => {
                  const expanded = isOpen(g)
                  return (
                    <li key={g.key}>
                      <button type="button" aria-expanded={expanded} onClick={() => setFolder(g, !expanded)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                        <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none', expanded && 'rotate-90')} aria-hidden />
                        <Folder className={cn('h-[18px] w-[18px] shrink-0 fill-current', g.tone)} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{g.label}</span>
                        <span className="text-xs tabular-nums text-muted-foreground" title="Modules set up">{g.items.filter((i) => done[i.id]).length}/{g.items.length}</span>
                      </button>
                      {expanded && (
                        <ul className="ml-[1.1rem] mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                          {g.items.map((i) => <li key={i.id}>{row(i, true)}</li>)}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border p-3">
        {!collapsed && (
          <Link href="/dashboard/settings?tab=features" onClick={onNavigate} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]">Progress</span>
            <span className="flex items-center gap-1 font-semibold tabular-nums">{doneTotal} / {moduleCount}<ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden /></span>
          </Link>
        )}
        {!drawer && onToggleRail && (
          <button type="button" onClick={onToggleRail} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}
            className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', collapsed && 'justify-center px-0')}>
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
        <Menu className="h-[18px] w-[18px]" aria-hidden />
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
