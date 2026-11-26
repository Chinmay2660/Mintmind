import {
  Activity, ArrowLeftRight, Briefcase, Building2, CalendarClock, CalendarDays, Car, ClipboardCheck, Coins, CreditCard, FileText, Globe, Home,
  HeartPulse, IdCard, KeyRound, Landmark, LineChart, List, Mail, MoreHorizontal, PieChart, PiggyBank, Repeat, ShoppingBag, Shield, ShieldCheck,
  Tv, TrendingUp, Umbrella, UserRound, Users, BriefcaseBusiness, BarChart3, Banknote, Compass, Database, Flag, LayoutDashboard, LayoutGrid,
  LifeBuoy, MessageCircle, Palette, Plug, Receipt, Sparkles, SlidersHorizontal, Stethoscope, Sunset, Target, Zap, type LucideIcon,
} from 'lucide-react'

// One icon per category, so every category strip in the app looks the same. Unknown names fall back to a neutral icon.
const FALLBACK: LucideIcon = MoreHorizontal

const ASSET: Record<string, LucideIcon> = {
  fd: Landmark, rd: CalendarClock, epf: Briefcase, gold: Coins, etf: LineChart, stocks: TrendingUp, ppf: PiggyBank,
  nps: Umbrella, realEstate: Building2, vehicle: Car, other: MoreHorizontal,
}
const DOCUMENT: Record<string, LucideIcon> = {
  Personal: UserRound, Identity: IdCard, Bank: Landmark, Investment: TrendingUp, Insurance: Shield, Property: Home, Family: Users,
}
const PASSWORD: Record<string, LucideIcon> = {
  Banking: Landmark, Email: Mail, Social: Globe, Shopping: ShoppingBag, Work: BriefcaseBusiness, Entertainment: Tv, Government: IdCard, Other: KeyRound,
}
const POLICY: Record<string, LucideIcon> = {
  health: HeartPulse, life: ShieldCheck, term: Shield, motor: Car, home: Home, other: MoreHorizontal,
}
const BUDGET_VIEW: Record<string, LucideIcon> = {
  transactions: List, calendar: CalendarDays, review: ClipboardCheck, monthly: BarChart3, summary: PieChart, stats: Activity, cashflow: ArrowLeftRight,
}
const INVEST: Record<string, LucideIcon> = {
  portfolio: PieChart, funds: TrendingUp, fd: Landmark, rd: Repeat, retirement: PiggyBank, epf: PiggyBank, ppf: PiggyBank, nps: PiggyBank, esop: Briefcase, realEstate: Building2, vehicle: Car, market: LineChart, gold: Coins,
}

export const assetIcon = (k: string) => ASSET[k] ?? FALLBACK
export const documentIcon = (k: string) => DOCUMENT[k] ?? FileText
export const passwordIcon = (k: string) => PASSWORD[k] ?? KeyRound
export const policyIcon = (k: string) => POLICY[k] ?? FALLBACK
export const budgetViewIcon = (k: string) => BUDGET_VIEW[k] ?? List
export const investIcon = (k: string) => INVEST[k] ?? CreditCard

// page-level sections (the tab rows at the top of a page)
const SECTION: Record<string, LucideIcon> = {
  // Wealth AI
  Ask: MessageCircle, 'Quick add': Zap, 'Health score': HeartPulse, Report: FileText,
  // Planning tools
  'Plan ahead': Compass, 'Money check-up': Stethoscope, 'Emergency fund': LifeBuoy, 'Loan payoff': Landmark, 'Insurance cover': Shield, Retirement: Sunset,
  // Settings
  Account: UserRound, 'My App Features': LayoutGrid, Appearance: Palette, Preferences: SlidersHorizontal, Automation: Zap, AI: Sparkles, Integrations: Plug, Data: Database,
  // Net worth
  Overview: LayoutDashboard, Goals: Flag, Forecast: TrendingUp,
  // Cards
  'Credit cards': CreditCard, 'Debit cards': Banknote,
  // Budget sections
  budgets: Target, transactions: Receipt, insights: BarChart3, recurring: Repeat, overview: LayoutDashboard,
}
export const sectionIcon = (k: string) => SECTION[k] ?? FALLBACK
