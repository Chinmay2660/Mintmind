'use client'
import React, { useEffect, useState } from 'react'
import { TrendingDown, Target, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const BudgetAnalysisPage = () => {
  const { user } = useAuth()
  const [budgetStats, setBudgetStats] = useState(null)
  const [expenseStats, setExpenseStats] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, selectedPeriod])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const [budgetResponse, expenseResponse] = await Promise.all([
        axios.get(`/api/dashboard/budget-stats?period=${selectedPeriod}`),
        axios.get(`/api/dashboard/expense-stats?period=${selectedPeriod}`),
      ])
      setBudgetStats(budgetResponse.data)
      setExpenseStats(expenseResponse.data)
    } catch (error) {
      toast.error('Failed to load statistics')
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

  const periodOptions = [
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
  ]

  const COLORS = ['#2563eb', '#0d9488', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444']

  if (loading) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-2/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-2"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Budget Analysis</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your spending against budgets
          </p>
        </div>
      </motion.div>

      {/* Period Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4"
      >
        {periodOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedPeriod(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedPeriod === option.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </motion.div>

      {/* Overall Budget vs Expense */}
      {budgetStats?.overall && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(budgetStats.overall.totalBudget)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(budgetStats.overall.totalExpenses)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
              <p
                className={`text-2xl font-bold ${
                  budgetStats.overall.remaining >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatCurrency(budgetStats.overall.remaining)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Usage</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      budgetStats.overall.percentage > 100
                        ? 'bg-red-500'
                        : budgetStats.overall.percentage > 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budgetStats.overall.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {budgetStats.overall.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Category-wise Budget vs Expense */}
      {budgetStats?.categories && budgetStats.categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category-wise Analysis</h2>
          <div className="space-y-4">
            {budgetStats.categories.map((category, index) => (
              <motion.div
                key={category.budgetId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.categoryIcon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {category.budgetName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{category.categoryName}</p>
                    </div>
                  </div>
                  {category.isOverBudget ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Budget:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(category.budgetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Spent:</span>
                    <span
                      className={`font-medium ${
                        category.isOverBudget
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {formatCurrency(category.spent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span
                      className={`font-medium ${
                        category.remaining >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(category.remaining)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Usage</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {category.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          category.percentage > 100
                            ? 'bg-red-500'
                            : category.percentage > 80
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Category-wise Expenses Chart */}
      {expenseStats?.categoryWise && expenseStats.categoryWise.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expenses by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseStats.categoryWise.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="categoryName"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
              />
              <Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Monthly Breakdown */}
      {expenseStats?.monthlyBreakdown && expenseStats.monthlyBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Breakdown</h2>
          <div className="space-y-3">
            {expenseStats.monthlyBreakdown.map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{month.month}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(month.amount)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default BudgetAnalysisPage

