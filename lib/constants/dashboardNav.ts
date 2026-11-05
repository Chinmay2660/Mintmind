import {
  Sparkles,
  LayoutDashboard,
  TrendingUp,
  Landmark,
  PieChart,
  CreditCard,
  Shield,
  Wallet,
  Users,
  KeyRound,
  FileText,
  HeartHandshake,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export const APP_NAME = 'Mintmind'

export interface DashboardNavItem {
  id: number
  name: string
  icon: LucideIcon
  path: string
}

/** The 12 product modules — the only navigable top-level destinations. */
export const DASHBOARD_NAV_ALL: DashboardNavItem[] = [
  { id: 1, name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 2, name: 'Net Worth', icon: TrendingUp, path: '/dashboard/net-worth' },
  { id: 3, name: 'Bank Accounts', icon: Landmark, path: '/dashboard/bank-accounts' },
  { id: 4, name: 'Mutual Funds', icon: PieChart, path: '/dashboard/mutual-funds' },
  { id: 5, name: 'Cards', icon: CreditCard, path: '/dashboard/credit-cards' },
  { id: 6, name: 'Insurance', icon: Shield, path: '/dashboard/insurance' },
  { id: 7, name: 'Budget & Expenses', icon: Wallet, path: '/dashboard/budget' },
  { id: 8, name: 'Family Circle', icon: Users, path: '/dashboard/family' },
  { id: 9, name: 'My Vault', icon: KeyRound, path: '/dashboard/vault' },
  { id: 10, name: 'Documents', icon: FileText, path: '/dashboard/documents' },
  { id: 11, name: 'Digital Legacy', icon: HeartHandshake, path: '/dashboard/legacy' },
  { id: 12, name: 'Settings', icon: Settings, path: '/dashboard/settings' },
]

/** Mobile bottom bar: primary modules; everything else lives under "More". */
const PRIMARY_IDS = [1, 2, 3, 7]
export const DASHBOARD_NAV_MAIN = DASHBOARD_NAV_ALL.filter((i) => PRIMARY_IDS.includes(i.id))
export const DASHBOARD_NAV_MORE = DASHBOARD_NAV_ALL.filter((i) => !PRIMARY_IDS.includes(i.id))

export interface SearchItem {
  name: string
  path: string
  icon: LucideIcon
  keywords?: string[]
  group?: 'pages' | 'actions'
}

export const DASHBOARD_SEARCH_PAGES: SearchItem[] = [...DASHBOARD_NAV_ALL, { id: 99, name: 'My Wealth AI', icon: Sparkles, path: '/dashboard/ai' }].map((item) => ({
  name: item.name,
  path: item.path,
  icon: item.icon,
  group: 'pages' as const,
}))

export const DASHBOARD_SEARCH_ACTIONS: SearchItem[] = []

export const DASHBOARD_SEARCH_ALL: SearchItem[] = [...DASHBOARD_SEARCH_PAGES, ...DASHBOARD_SEARCH_ACTIONS]

export const DASHBOARD_PAGE_TITLES: Record<string, string> = Object.fromEntries(
  [...DASHBOARD_NAV_ALL, { id: 99, name: 'My Wealth AI', icon: Sparkles, path: '/dashboard/ai' }].map((item) => [item.path, item.name])
)

const DASHBOARD_PAGE_ICONS: Record<string, LucideIcon> = Object.fromEntries(
  DASHBOARD_NAV_ALL.map((item) => [item.path, item.icon])
)

export function isDashboardNavActive(pathname: string, menuPath: string): boolean {
  if (menuPath === '/dashboard') return pathname === '/dashboard'
  return pathname === menuPath || pathname.startsWith(`${menuPath}/`)
}

function nested<T>(map: Record<string, T>, pathname: string): T | undefined {
  if (map[pathname]) return map[pathname]
  const key = Object.keys(map)
    .filter((p) => p !== '/dashboard')
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname.startsWith(`${p}/`))
  return key ? map[key] : undefined
}

export function getDashboardPageTitle(pathname: string): string {
  return nested(DASHBOARD_PAGE_TITLES, pathname) ?? 'Dashboard'
}

export function getDashboardPageIcon(pathname: string): LucideIcon | undefined {
  return nested(DASHBOARD_PAGE_ICONS, pathname)
}
