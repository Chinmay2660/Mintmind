'use client'
import { useAuth } from '@/lib/hooks/useAuth'
import React, { useEffect, useState } from 'react'
import {
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  ChevronRight,
  PiggyBank,
  ReceiptText,
  Users,
  Shield,
  CreditCard,
} from 'lucide-react'
import { format } from 'date-fns'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ActivityChart } from './_components/ActivityChart'
import { formatCurrency } from '@/lib/utils/format'
import { withFromHome } from '@/lib/utils/navigation'
import type { DashboardStats } from '@/types/dashboard'
import { useRegisterRefresh } from '@/contexts/RefreshContext'

interface Transaction {
  _id?: string
  id?: string
  type?: string
  amount?: number
  description?: string
  date?: string
  category?: { name?: string }
  categoryId?: { name?: string; icon?: string; color?: string }
}

const MORE_LINKS = [
  { label: 'Investments', valueKey: 'totalInvestments' as const, icon: TrendingUp, href: withFromHome('/dashboard/investments') },
  { label: 'Budgets', valueKey: null, icon: PiggyBank, href: withFromHome('/dashboard/budgets') },
  { label: 'Insurance', valueKey: null, icon: Shield, href: withFromHome('/dashboard/insurance') },
  { label: 'Credit Cards', valueKey: null, icon: CreditCard, href: withFromHome('/dashboard/credit-cards') },
  { label: 'Family', valueKey: null, icon: Users, href: withFromHome('/dashboard/family') },
  { label: 'All Transactions', valueKey: null, icon: ReceiptText, href: withFromHome('/dashboard/transactions') },
]

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, txRes] = await Promise.all([
        request.get('/api/dashboard/stats'),
        request.get('/api/transactions'),
      ])
      setStats(statsRes.data || {})
      setTransactions(txRes.data || [])
    } catch {
      toast.error('Failed to load dashboard data')
      setStats({})
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useRegisterRefresh(fetchData)

  const balance = (stats?.totalBankBalance || 0) + (stats?.totalCash || 0)
  const savings = stats?.monthlySavings || 0
  const savingsPct =
    stats?.monthlyIncome
      ? Math.min(100, Math.round((savings / stats.monthlyIncome) * 100))
      : 0

  const quickActions = [
    {
      label: 'Expense',
      icon: ArrowDownCircle,
      href: withFromHome('/dashboard/transactions/new?type=expense'),
      iconClass: 'text-red-500',
    },
    {
      label: 'Income',
      icon: ArrowUpCircle,
      href: withFromHome('/dashboard/transactions/new?type=income'),
      iconClass: 'text-green-500',
    },
    {
      label: 'Transfer',
      icon: ArrowLeftRight,
      href: withFromHome('/dashboard/transactions/new?type=transfer'),
      iconClass: 'text-amber-500',
    },
  ]

  const recentTransactions = transactions.slice(0, 5)
  const displayName = user?.name || user?.email?.split('@')[0] || 'Guest'

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
      {/* Header: greeting + quick actions on desktop */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2 shrink-0"
        >
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            {format(new Date(), 'EEEE, MMM d')}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">
            {authLoading ? 'Loading...' : `Hi, ${displayName}`}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-2 md:gap-3 lg:max-w-md lg:flex-1"
        >
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                className="finance-action-btn group"
              >
                <div className="finance-action-icon mx-auto md:group-hover:shadow-lg md:group-hover:shadow-primary/15">
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 ${action.iconClass}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
              </Link>
            )
          })}
        </motion.div>
      </div>

      {/* Top row: balance + activity chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 relative overflow-hidden rounded-3xl liquid-gradient-bg p-6 md:p-8 text-white shadow-xl shadow-primary/30 flex flex-col justify-between min-h-[200px]"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full bg-white/5" />
          <div>
            <p className="text-sm font-medium text-white/80">Your Balance</p>
            <p className="text-4xl md:text-5xl font-bold tracking-tight mt-2">
              {loading ? '—' : formatCurrency(balance)}
            </p>
          </div>
          <div className="flex gap-8 mt-6 text-sm">
            <div>
              <p className="text-white/70">Income</p>
              <p className="font-semibold text-base">
                {loading ? '—' : formatCurrency(stats?.monthlyIncome || 0)}
              </p>
            </div>
            <div>
              <p className="text-white/70">Expenses</p>
              <p className="font-semibold text-base">
                {loading ? '—' : formatCurrency(stats?.monthlyExpenses || 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 surface-card p-5 md:p-6"
        >
          <h2 className="text-lg font-semibold mb-2">Activities</h2>
          <p className="text-sm text-muted-foreground mb-4">Expenses this week</p>
          {loading ? (
            <div className="h-36 md:h-44 lg:h-48 rounded-xl skeleton" />
          ) : (
            <ActivityChart transactions={transactions} />
          )}
        </motion.div>
      </div>

      {/* Middle row: savings, accounts, investments, budgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="surface-card p-5 md:p-6 h-full flex items-center"
        >
          <div className="flex items-center gap-6 w-full">
            <div className="relative w-20 h-20 md:w-24 md:h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${savingsPct * 2.64} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{loading ? '—' : `${savingsPct}%`}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Saved this month</p>
              <p className="text-xl md:text-2xl font-bold mt-1">
                {loading ? '—' : formatCurrency(savings)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Net worth {loading ? '—' : formatCurrency(stats?.netWorth || 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="h-full"
        >
          <Link href={withFromHome('/dashboard/accounts')} className="block h-full">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-5 md:p-6 text-primary-foreground shadow-lg shadow-primary/20 h-full flex flex-col justify-center transition-transform active:scale-[0.98] md:hover:shadow-xl md:hover:shadow-primary/25">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-primary-foreground/90">Your Accounts</p>
                <ChevronRight className="w-5 h-5 text-primary-foreground/70" />
              </div>
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wider">Total Balance</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">
                {loading ? '—' : formatCurrency(balance)}
              </p>
              <p className="text-sm text-primary-foreground/80 mt-3">
                {stats?.accountCount || 0} accounts · Manage
              </p>
            </div>
          </Link>
        </motion.div>

        {MORE_LINKS.slice(0, 2).map((item, i) => {
          const Icon = item.icon
          const value = item.valueKey ? stats?.[item.valueKey] : null
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="h-full"
            >
              <Link
                href={item.href}
                className="surface-card p-5 h-full flex items-center gap-4 transition-all active:scale-[0.98] md:hover:shadow-lg md:hover:shadow-primary/5"
              >
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  {value != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {loading ? '—' : formatCurrency(value || 0)}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Quick links row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
        {MORE_LINKS.slice(2).map((item, i) => {
          const Icon = item.icon
          const value = item.valueKey ? stats?.[item.valueKey] : null
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
              className="h-full"
            >
              <Link
                href={item.href}
                className="surface-card p-5 h-full flex items-center gap-4 transition-all active:scale-[0.98] md:hover:shadow-lg md:hover:shadow-primary/5"
              >
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  {value != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {loading ? '—' : formatCurrency(value || 0)}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Recent transactions — full width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <Link
            href={withFromHome('/dashboard/transactions')}
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface-card h-16 animate-pulse" />
            ))
          ) : recentTransactions.length === 0 ? (
            <div className="surface-card p-6 text-center text-muted-foreground text-sm md:col-span-2 xl:col-span-3">
              No transactions yet. Add an expense, income, or transfer to get started.
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const catColor = tx.categoryId?.color || '#4845d2'
              const catIcon = tx.categoryId?.icon
              const catName = tx.categoryId?.name
              const isIncome = tx.type === 'income'
              const isTransfer = tx.type === 'transfer'
              return (
              <Link
                key={tx._id || tx.id}
                href={withFromHome('/dashboard/transactions')}
                className="flex items-center gap-3 p-3 rounded-2xl surface-card transition-all active:scale-[0.98] md:hover:shadow-md"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base"
                  style={{ backgroundColor: `${isTransfer ? '#f59e0b' : catColor}22` }}
                >
                  {isTransfer ? '↔' : catIcon || (isIncome ? '💰' : '📁')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {tx.description || (isTransfer ? 'Transfer' : catName) || 'Transaction'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : ''}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold shrink-0 ${
                    isIncome
                      ? 'text-green-600 dark:text-green-400'
                      : isTransfer
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-foreground'
                  }`}
                >
                  {isIncome ? '+' : isTransfer ? '↔' : '-'}
                  {formatCurrency(tx.amount || 0)}
                </p>
              </Link>
            )})
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard
