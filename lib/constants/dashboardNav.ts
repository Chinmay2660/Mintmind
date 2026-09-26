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
  Shield,
  CreditCard,
  LineChart,
  Hash,
  Zap,
  Target,
  Home,
  Repeat,
  Bell,
  Lock,
  FileText,
  ShieldCheck,
  Calculator,
  Upload,
  Scale,
  PieChart,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'

export const APP_NAME = 'Mintmind'

export interface DashboardNavItem {
  id: number
  name: string
  icon: LucideIcon
  path: string
}

export interface DashboardNavSection {
  id: string
  label: string
  items: DashboardNavItem[]
}

export const DASHBOARD_NAV_MAIN: DashboardNavItem[] = [
  { id: 1, name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 2, name: 'Accounts', icon: Wallet, path: '/dashboard/accounts' },
  { id: 3, name: 'Transactions', icon: ReceiptText, path: '/dashboard/transactions' },
  { id: 6, name: 'Budgets', icon: PiggyBank, path: '/dashboard/budgets' },
]

export const DASHBOARD_NAV_MORE: DashboardNavItem[] = [
  { id: 4, name: 'Portfolio', icon: TrendingUp, path: '/dashboard/investments' },
  { id: 13, name: 'Cards', icon: CreditCard, path: '/dashboard/credit-cards' },
  { id: 24, name: 'Loans', icon: Home, path: '/dashboard/loans' },
  { id: 12, name: 'Insurance', icon: Shield, path: '/dashboard/insurance' },
  { id: 5, name: 'Categories', icon: Tags, path: '/dashboard/categories' },
  { id: 7, name: 'Salary & Recurring', icon: IndianRupee, path: '/dashboard/salary-recurring' },
  { id: 17, name: 'Subscriptions', icon: Repeat, path: '/dashboard/subscriptions' },
  { id: 30, name: 'Vault', icon: Lock, path: '/dashboard/vault' },
  { id: 31, name: 'Nominee', icon: UserCheck, path: '/dashboard/nominee' },
  { id: 19, name: 'Passwords', icon: Lock, path: '/dashboard/passwords' },
  { id: 28, name: 'Documents', icon: FileText, path: '/dashboard/documents' },
  { id: 20, name: 'Mutual Funds', icon: PieChart, path: '/dashboard/investments/mutual-funds' },
  { id: 21, name: 'Performance', icon: LineChart, path: '/dashboard/investments/performance' },
  { id: 22, name: 'Rebalancing', icon: Scale, path: '/dashboard/investments/rebalancing' },
  { id: 23, name: 'Emergency Fund', icon: ShieldCheck, path: '/dashboard/emergency-fund' },
  { id: 15, name: 'Tags', icon: Hash, path: '/dashboard/tags' },
  { id: 16, name: 'Rules', icon: Zap, path: '/dashboard/rules' },
  { id: 18, name: 'Reminders', icon: Bell, path: '/dashboard/reminders' },
  { id: 14, name: 'Goals', icon: Target, path: '/dashboard/goals' },
  { id: 25, name: 'Savings Planner', icon: Calculator, path: '/dashboard/planners/savings' },
  { id: 26, name: 'Retirement Planner', icon: Calculator, path: '/dashboard/planners/retirement' },
  { id: 27, name: 'FIRE Planner', icon: Calculator, path: '/dashboard/planners/fire' },
  { id: 10, name: 'Daily Stats', icon: LineChart, path: '/dashboard/stats' },
  { id: 11, name: 'Category Stats', icon: BarChart3, path: '/dashboard/stats/categories' },
  { id: 29, name: 'Import / Export', icon: Upload, path: '/dashboard/import-export' },
  { id: 8, name: 'Family Circle', icon: Users, path: '/dashboard/family' },
  { id: 9, name: 'Settings', icon: Settings, path: '/dashboard/settings' },
]

export const DASHBOARD_NAV_ALL = [...DASHBOARD_NAV_MAIN, ...DASHBOARD_NAV_MORE]

export const DASHBOARD_NAV_SECTIONS: DashboardNavSection[] = [
  {
    id: 'core',
    label: 'Core',
    items: [{ id: 1, name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }],
  },
  {
    id: 'money',
    label: 'Expenses',
    items: [
      { id: 3, name: 'Transactions', icon: ReceiptText, path: '/dashboard/transactions' },
      { id: 6, name: 'Budgets', icon: PiggyBank, path: '/dashboard/budgets' },
      { id: 5, name: 'Categories', icon: Tags, path: '/dashboard/categories' },
      { id: 7, name: 'Recurring', icon: IndianRupee, path: '/dashboard/salary-recurring' },
      { id: 17, name: 'Subscriptions', icon: Repeat, path: '/dashboard/subscriptions' },
    ],
  },
  {
    id: 'finances',
    label: 'Finances',
    items: [
      { id: 2, name: 'Accounts', icon: Wallet, path: '/dashboard/accounts' },
      { id: 13, name: 'Cards', icon: CreditCard, path: '/dashboard/credit-cards' },
      { id: 24, name: 'Loans', icon: Home, path: '/dashboard/loans' },
      { id: 12, name: 'Insurance', icon: Shield, path: '/dashboard/insurance' },
    ],
  },
  {
    id: 'investments',
    label: 'Investments',
    items: [
      { id: 4, name: 'Portfolio', icon: TrendingUp, path: '/dashboard/investments' },
      { id: 20, name: 'Mutual Funds', icon: PieChart, path: '/dashboard/investments/mutual-funds' },
      { id: 21, name: 'Performance', icon: LineChart, path: '/dashboard/investments/performance' },
      { id: 22, name: 'Rebalancing', icon: Scale, path: '/dashboard/investments/rebalancing' },
    ],
  },
  {
    id: 'planner',
    label: 'Planner',
    items: [
      { id: 14, name: 'Goals', icon: Target, path: '/dashboard/goals' },
      { id: 23, name: 'Emergency Fund', icon: ShieldCheck, path: '/dashboard/emergency-fund' },
      { id: 25, name: 'Savings Planner', icon: Calculator, path: '/dashboard/planners/savings' },
      { id: 26, name: 'Retirement Planner', icon: Calculator, path: '/dashboard/planners/retirement' },
      { id: 27, name: 'FIRE Planner', icon: Calculator, path: '/dashboard/planners/fire' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      { id: 10, name: 'Daily Stats', icon: LineChart, path: '/dashboard/stats' },
      { id: 11, name: 'Category Stats', icon: BarChart3, path: '/dashboard/stats/categories' },
    ],
  },
  {
    id: 'vault',
    label: 'Vault',
    items: [
      { id: 30, name: 'Vault', icon: Lock, path: '/dashboard/vault' },
      { id: 31, name: 'Nominee', icon: UserCheck, path: '/dashboard/nominee' },
      { id: 19, name: 'Passwords', icon: Lock, path: '/dashboard/passwords' },
      { id: 28, name: 'Documents', icon: FileText, path: '/dashboard/documents' },
    ],
  },
  {
    id: 'more',
    label: 'More',
    items: [
      { id: 15, name: 'Tags', icon: Hash, path: '/dashboard/tags' },
      { id: 16, name: 'Rules', icon: Zap, path: '/dashboard/rules' },
      { id: 18, name: 'Reminders', icon: Bell, path: '/dashboard/reminders' },
      { id: 8, name: 'Family Circle', icon: Users, path: '/dashboard/family' },
      { id: 29, name: 'Import / Export', icon: Upload, path: '/dashboard/import-export' },
      { id: 9, name: 'Settings', icon: Settings, path: '/dashboard/settings' },
    ],
  },
]

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
  { name: 'Add income', path: '/dashboard/transactions/new?type=income', icon: ArrowUpCircle, keywords: ['income', 'salary'], group: 'actions' },
  { name: 'Add expense', path: '/dashboard/transactions/new?type=expense', icon: ArrowDownCircle, keywords: ['expense', 'spend'], group: 'actions' },
  { name: 'Add transfer', path: '/dashboard/transactions/new?type=transfer', icon: ArrowLeftRight, keywords: ['transfer'], group: 'actions' },
  { name: 'Add investment', path: '/dashboard/investments/new', icon: Plus, keywords: ['invest'], group: 'actions' },
  { name: 'Add goal', path: '/dashboard/goals/new', icon: Plus, keywords: ['goal'], group: 'actions' },
  { name: 'Add budget', path: '/dashboard/budgets/new', icon: Plus, keywords: ['budget'], group: 'actions' },
  { name: 'Add account', path: '/dashboard/accounts/new', icon: Plus, keywords: ['bank'], group: 'actions' },
  { name: 'Add insurance', path: '/dashboard/insurance/new', icon: Plus, keywords: ['insurance'], group: 'actions' },
  { name: 'Add credit card', path: '/dashboard/credit-cards/new', icon: Plus, keywords: ['credit card'], group: 'actions' },
  { name: 'Add debit card', path: '/dashboard/credit-cards?tab=debit&action=add', icon: Plus, keywords: ['debit card', 'atm'], group: 'actions' },
  { name: 'Add reminder', path: '/dashboard/reminders/new', icon: Plus, keywords: ['reminder'], group: 'actions' },
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
  '/dashboard/investments/mutual-funds': 'Mutual Funds',
  '/dashboard/investments/performance': 'Performance',
  '/dashboard/investments/rebalancing': 'Rebalancing',
  '/dashboard/emergency-fund': 'Emergency Fund',
  '/dashboard/planners/savings': 'Savings Planner',
  '/dashboard/planners/retirement': 'Retirement Planner',
  '/dashboard/planners/fire': 'FIRE Planner',
  '/dashboard/import-export': 'Import / Export',
  '/dashboard/vault': 'Vault',
  '/dashboard/nominee': 'Nominee',
}

const EXTRA_ROUTE_ICONS: Record<string, LucideIcon> = {
  '/dashboard/stats': LineChart,
  '/dashboard/stats/categories': BarChart3,
  '/dashboard/budget-analysis': BarChart3,
  '/dashboard/expenseList': ReceiptText,
  '/dashboard/investments/mutual-funds': PieChart,
  '/dashboard/investments/performance': LineChart,
  '/dashboard/investments/rebalancing': Scale,
  '/dashboard/emergency-fund': ShieldCheck,
  '/dashboard/planners/savings': Calculator,
  '/dashboard/planners/retirement': Calculator,
  '/dashboard/planners/fire': Calculator,
  '/dashboard/import-export': Upload,
  '/dashboard/vault': Lock,
  '/dashboard/nominee': UserCheck,
}

export const DASHBOARD_PAGE_TITLES: Record<string, string> = {
  ...Object.fromEntries(DASHBOARD_NAV_ALL.map((item) => [item.path, item.name])),
  ...EXTRA_ROUTE_TITLES,
}

const DASHBOARD_PAGE_ICONS: Record<string, LucideIcon> = {
  ...Object.fromEntries(DASHBOARD_NAV_ALL.map((item) => [item.path, item.icon])),
  ...EXTRA_ROUTE_ICONS,
}

export function isDashboardNavActive(pathname: string, menuPath: string): boolean {
  if (menuPath === '/dashboard') return pathname === '/dashboard'
  if (pathname === menuPath) return true
  if (!pathname.startsWith(`${menuPath}/`)) return false

  const hasMoreSpecificMatch = DASHBOARD_NAV_ALL.some(
    (item) =>
      item.path !== menuPath &&
      item.path.startsWith(`${menuPath}/`) &&
      (pathname === item.path || pathname.startsWith(`${item.path}/`))
  )

  return !hasMoreSpecificMatch
}

export function getDashboardPageTitle(pathname: string): string {
  if (DASHBOARD_PAGE_TITLES[pathname]) return DASHBOARD_PAGE_TITLES[pathname]

  const nested = Object.keys(DASHBOARD_PAGE_TITLES)
    .filter((path) => path !== '/dashboard')
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(`${path}/`))

  return nested ? DASHBOARD_PAGE_TITLES[nested] : 'Dashboard'
}

export function getDashboardPageIcon(pathname: string): LucideIcon | undefined {
  if (DASHBOARD_PAGE_ICONS[pathname]) return DASHBOARD_PAGE_ICONS[pathname]

  const nested = Object.keys(DASHBOARD_PAGE_ICONS)
    .filter((path) => path !== '/dashboard')
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(`${path}/`))

  return nested ? DASHBOARD_PAGE_ICONS[nested] : undefined
}
