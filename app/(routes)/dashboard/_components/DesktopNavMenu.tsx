'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Check, ChevronDown } from 'lucide-react'
import { DASHBOARD_NAV_SECTIONS, isDashboardNavActive } from '@/lib/constants/dashboardNav'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const triggerClass =
  'inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring'

const idleClass =
  'text-muted-foreground hover:bg-muted/60 hover:text-foreground data-[state=open]:bg-muted/60 data-[state=open]:text-foreground'

const activeClass = 'bg-foreground text-background shadow-sm data-[state=open]:bg-foreground/90'

/** Pill menubar: single-item sections render as links, the rest as dropdown menus. */
export function DesktopNavMenu({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className={cn(
        'flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border/60 bg-card/70 p-1 shadow-[var(--shadow-card)] backdrop-blur',
        className
      )}
    >
      {DASHBOARD_NAV_SECTIONS.map((section) => {
        const sectionActive = section.items.some((item) => isDashboardNavActive(pathname, item.path))

        if (section.items.length === 1) {
          const item = section.items[0]
          return (
            <Link
              key={section.id}
              href={item.path}
              aria-current={sectionActive ? 'page' : undefined}
              className={cn(triggerClass, sectionActive ? activeClass : idleClass)}
            >
              {item.name}
            </Link>
          )
        }

        return (
          <DropdownMenu key={section.id} modal={false}>
            <DropdownMenuTrigger
              className={cn(triggerClass, sectionActive ? activeClass : idleClass)}
            >
              {section.label}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" strokeWidth={2} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={10} className="w-60 rounded-2xl border-border/60 p-1.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isDashboardNavActive(pathname, item.path)
                return (
                  <DropdownMenuItem key={item.id} asChild className="cursor-pointer rounded-xl px-2.5 py-2">
                    <Link href={item.path} aria-current={active ? 'page' : undefined} className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          active ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className={cn('flex-1 truncate text-sm', active && 'font-medium text-primary')}>
                        {item.name}
                      </span>
                      {active && <Check className="h-4 w-4 text-primary" aria-hidden />}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </nav>
  )
}
