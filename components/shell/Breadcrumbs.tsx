'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { DASHBOARD_NAV_ALL, getDashboardPageTitle } from '@/lib/constants/dashboardNav'
import { useDetailCrumbValue, usePageInfoValue } from './DetailCrumb'
import { InfoTip } from '@/components/wealth/kit'

/** Where you are: Overview / Accounts / Details. The last item is the page title (the h1), earlier ones link back. */
export function Breadcrumbs() {
  const pathname = usePathname()
  const open = useDetailCrumbValue()
  const info = usePageInfoValue()
  const pageTitle = getDashboardPageTitle(pathname)
  // when a page has a record open in place (a card, a goal, a policy), its name becomes the title and the page becomes a crumb
  const title = open ? open.label : pageTitle
  const parts = pathname.split('/').filter(Boolean) // ['dashboard', 'bank-accounts', 'abc']
  const trail: { name: string; href: string; onClick?: () => void }[] = []
  if (open) {
    trail.push({ name: DASHBOARD_NAV_ALL[0].name, href: '/dashboard' }, { name: pageTitle, href: pathname, onClick: open.onBack })
  } else if (parts.length > 1) {
    trail.push({ name: DASHBOARD_NAV_ALL[0].name, href: '/dashboard' })
    const first = `/dashboard/${parts[1]}`
    const item = DASHBOARD_NAV_ALL.find((n) => n.path === first)
    if (parts.length > 2) {
      trail.push({ name: item?.name ?? getDashboardPageTitle(first), href: first })
      // a record page (an id) has no title of its own
      if (title === (item?.name ?? '')) trail.push({ name: 'Details', href: pathname })
    }
  }
  return (
    <div className="min-w-0">
      {trail.length > 0 && (
        <nav aria-label="Breadcrumb" className="hidden md:block">
          <ol className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {trail.map((t) => (
              <li key={t.href + t.name} className="flex items-center gap-1">
                <Link href={t.href} onClick={t.onClick ? (e) => { e.preventDefault(); t.onClick!() } : undefined} className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{t.name}</Link>
                <ChevronRight className="h-3 w-3" aria-hidden />
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex min-w-0 items-center gap-1.5"><h1 className="min-w-0 truncate text-base font-semibold md:text-lg" aria-current="page">{title}</h1>{info && !open && <InfoTip label={title}>{info}</InfoTip>}</div>
    </div>
  )
}
