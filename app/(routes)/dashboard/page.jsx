'use client'
import { useAuth } from '@/lib/hooks/useAuth'
import React, { useEffect, useState } from 'react'
import { Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle, DollarSign, Plus, ChevronRight, Target } from 'lucide-react'
import { format } from 'date-fns'
import axios from 'axios'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/dashboard/stats')
      setStats(response.data || {})
    } catch (error) {
      toast.error('Failed to load dashboard data')
      setStats({}) // Set empty object on error so we don't show skeletons
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const statCards = [
    {
      title: 'Net Worth',
      value: stats?.netWorth || 0,
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Total Balance',
      value: (stats?.totalBankBalance || 0) + (stats?.totalCash || 0),
      icon: Wallet,
      gradient: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Monthly Income',
      value: stats?.monthlyIncome || 0,
      icon: ArrowUpCircle,
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Monthly Expenses',
      value: stats?.monthlyExpenses || 0,
      icon: ArrowDownCircle,
      gradient: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    {
      title: 'Investments',
      value: stats?.totalInvestments || 0,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Savings',
      value: stats?.monthlySavings || 0,
      icon: TrendingUp,
      gradient: stats?.monthlySavings >= 0 ? 'from-teal-500 to-teal-600' : 'from-orange-500 to-orange-600',
      bgColor: stats?.monthlySavings >= 0 ? 'bg-teal-50 dark:bg-teal-950/20' : 'bg-orange-50 dark:bg-orange-950/20',
      iconColor: stats?.monthlySavings >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400',
    },
  ]

  const quickActions = [
    {
      label: 'Add Income',
      icon: ArrowUpCircle,
      href: '/dashboard/transactions?action=add&type=income',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      label: 'Add Expense',
      icon: ArrowDownCircle,
      href: '/dashboard/transactions?action=add&type=expense',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      label: 'Add Account',
      icon: Wallet,
      href: '/dashboard/accounts?action=add',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      label: 'Add Investment',
      icon: TrendingUp,
      href: '/dashboard/investments?action=add',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      label: 'Create Budget',
      icon: Target,
      href: '/dashboard/budgets?action=add',
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/20',
    },
  ]

  // Always show content - no loading skeletons

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {authLoading ? (
            <span className="inline-block w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
          ) : (
            <>Hi, {user?.name || user?.email?.split('@')[0] || 'Guest'} 👋</>
          )}
        </h1>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </motion.div>

      {/* Stats Grid - Native Style Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          // Show skeletons while loading
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          ))
        ) : (
          statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 active:scale-95 transition-transform"
              >
              {/* Gradient Accent */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${card.gradient} opacity-10 rounded-bl-full`} />
              
              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl ${card.bgColor} mb-4`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  {card.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(card.value)}
                </p>
              </div>
            </motion.div>
          )
        }))}
      </div>

      {/* Quick Actions - Native Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={index}
                href={action.href}
                className="group"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl ${action.bgColor} border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-700 transition-all active:scale-95`}
                >
                  <Icon className={`w-6 h-6 ${action.color} mb-2`} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                    {action.label}
                  </span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accounts Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Accounts</h2>
            <Link href="/dashboard/accounts">
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <span className="text-sm text-gray-600 dark:text-gray-400">Bank Accounts</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats?.accountCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <span className="text-sm text-gray-600 dark:text-gray-400">Cash Balance</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats?.totalCash || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <span className="text-sm text-gray-600 dark:text-gray-400">Bank Balance</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats?.totalBankBalance || 0)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Investments Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Investments</h2>
            <Link href="/dashboard/investments">
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Investments</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats?.totalInvestments || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <span className="text-sm text-gray-600 dark:text-gray-400">Investment Count</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats?.investmentCount || 0}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Budget Analysis Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Budget Analysis</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track your spending against budgets
            </p>
          </div>
          <Link href="/dashboard/budget-analysis">
            <Button variant="outline" className="rounded-full">
              <Target className="w-4 h-4 mr-2" />
              View Analysis
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard
