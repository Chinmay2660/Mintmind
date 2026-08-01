import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  TrendingUp,
  Tags,
  PiggyBank,
  DollarSign,
  Users,
  Settings,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

export const APP_NAME = 'Mintmind'

export interface DashboardNavItem {
  id: number
  name: string
  icon: LucideIcon
  path: string
}

export const DASHBOARD_NAV_MAIN: DashboardNavItem[] = [
  { id: 1, name: 'Home', icon: LayoutDashboard, path: '/dashboard' },
  { id: 2, name: 'Accounts', icon: Wallet, path: '/dashboard/accounts' },
  { id: 3, name: 'Transactions', icon: ReceiptText, path: '/dashboard/transactions' },
]

export const DASHBOARD_NAV_MORE: DashboardNavItem[] = [
  { id: 4, name: 'Investments', icon: TrendingUp, path: '/dashboard/investments' },
  { id: 5, name: 'Categories', icon: Tags, path: '/dashboard/categories' },
  { id: 6, name: 'Budgets', icon: PiggyBank, path: '/dashboard/budgets' },
  { id: 7, name: 'Salary', icon: DollarSign, path: '/dashboard/salary-recurring' },
  { id: 8, name: 'Family Circle', icon: Users, path: '/dashboard/family' },
  { id: 9, name: 'Settings', icon: Settings, path: '/dashboard/settings' },
]

export const DASHBOARD_NAV_ALL = [...DASHBOARD_NAV_MAIN, ...DASHBOARD_NAV_MORE]

const EXTRA_ROUTE_TITLES: Record<string, string> = {
  '/dashboard/budget-analysis': 'Budget Analysis',
  '/dashboard/budget': 'Budget',
  '/dashboard/expenseList': 'Expenses',
}

const EXTRA_ROUTE_ICONS: Record<string, LucideIcon> = {
  '/dashboard/budget-analysis': BarChart3,
  '/dashboard/expenseList': ReceiptText,
}

export const DASHBOARD_PAGE_TITLES: Record<string, string> = {
  ...Object.fromEntries(DASHBOARD_NAV_ALL.map((item) => [item.path, item.name])),
  ...EXTRA_ROUTE_TITLES,
}

const DASHBOARD_PAGE_ICONS: Record<string, LucideIcon> = {
  ...Object.fromEntries(DASHBOARD_NAV_ALL.map((item) => [item.path, item.icon])),
  ...EXTRA_ROUTE_ICONS,
}

export function getDashboardPageTitle(pathname: string): string {
  if (DASHBOARD_PAGE_TITLES[pathname]) return DASHBOARD_PAGE_TITLES[pathname]

  const nested = Object.keys(DASHBOARD_PAGE_TITLES)
    .filter((path) => path !== '/dashboard')
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(`${path}/`))

  return nested ? DASHBOARD_PAGE_TITLES[nested] : 'Home'
}

export function getDashboardPageIcon(pathname: string): LucideIcon | undefined {
  if (DASHBOARD_PAGE_ICONS[pathname]) return DASHBOARD_PAGE_ICONS[pathname]

  const nested = Object.keys(DASHBOARD_PAGE_ICONS)
    .filter((path) => path !== '/dashboard')
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(`${path}/`))

  return nested ? DASHBOARD_PAGE_ICONS[nested] : undefined
}
