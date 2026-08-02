import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  TrendingUp,
  Tags,
  PiggyBank,
  IndianRupee,
  Users,
  Settings,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Plus,
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
  { id: 3, name: 'Transactions', icon: ReceiptText, path: '/dashboard/transactions' },
  { id: 2, name: 'Accounts', icon: Wallet, path: '/dashboard/accounts' },
]

export const DASHBOARD_NAV_MORE: DashboardNavItem[] = [
  { id: 4, name: 'Investments', icon: TrendingUp, path: '/dashboard/investments' },
  { id: 5, name: 'Categories', icon: Tags, path: '/dashboard/categories' },
  { id: 6, name: 'Budgets', icon: PiggyBank, path: '/dashboard/budgets' },
  { id: 7, name: 'Salary & Recurring Expenses', icon: IndianRupee, path: '/dashboard/salary-recurring' },
  { id: 8, name: 'Family Circle', icon: Users, path: '/dashboard/family' },
  { id: 11, name: 'Category Stats', icon: BarChart3, path: '/dashboard/stats/categories' },
  { id: 9, name: 'Settings', icon: Settings, path: '/dashboard/settings' },
]

export const DASHBOARD_NAV_ALL = [...DASHBOARD_NAV_MAIN, ...DASHBOARD_NAV_MORE]

export interface SearchItem {
  name: string
  path: string
  icon: LucideIcon
  keywords?: string[]
  group?: 'pages' | 'actions'
}

export const DASHBOARD_SEARCH_PAGES: SearchItem[] = [
  ...DASHBOARD_NAV_ALL.map((item) => ({
    name: item.name,
    path: item.path,
    icon: item.icon,
    group: 'pages' as const,
  })),
  {
    name: 'Budget Analysis',
    path: '/dashboard/budget-analysis',
    icon: BarChart3,
    keywords: ['charts', 'analysis', 'spending', 'budget'],
    group: 'pages',
  },
]

export const DASHBOARD_SEARCH_ACTIONS: SearchItem[] = [
  {
    name: 'Add income',
    path: '/dashboard/transactions/new?type=income',
    icon: ArrowUpCircle,
    keywords: ['income', 'salary', 'credit', 'deposit'],
    group: 'actions',
  },
  {
    name: 'Add expense',
    path: '/dashboard/transactions/new?type=expense',
    icon: ArrowDownCircle,
    keywords: ['expense', 'spend', 'debit', 'payment'],
    group: 'actions',
  },
  {
    name: 'Add transfer',
    path: '/dashboard/transactions/new?type=transfer',
    icon: ArrowLeftRight,
    keywords: ['transfer', 'move', 'between accounts'],
    group: 'actions',
  },
  {
    name: 'Add investment',
    path: '/dashboard/investments/new',
    icon: Plus,
    keywords: ['invest', 'stock', 'mutual fund'],
    group: 'actions',
  },
  {
    name: 'Add budget',
    path: '/dashboard/budgets/new',
    icon: Plus,
    keywords: ['budget', 'limit'],
    group: 'actions',
  },
  {
    name: 'Add account',
    path: '/dashboard/accounts/new',
    icon: Plus,
    keywords: ['bank', 'wallet', 'cash'],
    group: 'actions',
  },
]

export const DASHBOARD_SEARCH_ALL: SearchItem[] = [
  ...DASHBOARD_SEARCH_PAGES,
  ...DASHBOARD_SEARCH_ACTIONS,
]

const EXTRA_ROUTE_TITLES: Record<string, string> = {
  '/dashboard/stats': 'Daily Stats',
  '/dashboard/stats/categories': 'Category Stats',
  '/dashboard/budget-analysis': 'Statistics',
  '/dashboard/budget': 'Budget',
  '/dashboard/expenseList': 'Expenses',
}

const EXTRA_ROUTE_ICONS: Record<string, LucideIcon> = {
  '/dashboard/stats/categories': BarChart3,
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
