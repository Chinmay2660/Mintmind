import { Landmark, LayoutDashboard, PieChart, CreditCard, Shield, Wallet, Users, KeyRound, FileText, HeartHandshake, Sparkles, Zap, TrendingUp, Calculator, type LucideIcon } from 'lucide-react'

/** Feature / goal icon names (from lib/features.js) to components. */
export const ICONS: Record<string, LucideIcon> = { Landmark, LayoutDashboard, PieChart, CreditCard, Shield, Wallet, Users, KeyRound, FileText, HeartHandshake, Sparkles, Zap, TrendingUp, Calculator }
export const iconFor = (name: string): LucideIcon => ICONS[name] ?? Sparkles
