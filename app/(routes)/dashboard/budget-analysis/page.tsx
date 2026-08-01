'use client'
import React, { useEffect, useState } from 'react'
import { TrendingDown, Target, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { TabButtonGroup } from '@/components/ui/tab-button'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { formatCurrency } from '@/lib/utils/format'
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
        request.get(`/api/dashboard/budget-stats?period=${selectedPeriod}`),
        request.get(`/api/dashboard/expense-stats?period=${selectedPeriod}`),
      ])
      setBudgetStats(budgetResponse.data)
      setExpenseStats(expenseResponse.data)
    } catch (error) {
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const periodOptions = [
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
  ]

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#ec4899', '#f59e0b', '#ef4444']

  if (loading) return <PageSkeleton className="pb-24 md:pb-6" />

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Budget Analysis"
        subtitle="Track your spending against budgets"
        showBack
      />

      <TabButtonGroup
        value={selectedPeriod}
        onValueChange={setSelectedPeriod}
        options={periodOptions}
        className="overflow-x-auto pb-2 -mx-4 px-4"
      />

      {/* Overall Budget vs Expense */}
      {budgetStats?.overall && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="surface-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Overall Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(budgetStats.overall.totalBudget)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(budgetStats.overall.totalExpenses)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Remaining</p>
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
              <p className="text-sm text-muted-foreground mb-1">Usage</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
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
                <span className="text-sm font-medium text-foreground">
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
          className="surface-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Category-wise Analysis</h2>
          <div className="space-y-4">
            {budgetStats.categories.map((category, index) => (
              <motion.div
                key={category.budgetId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="p-4 rounded-xl surface-inner"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.categoryIcon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {category.budgetName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{category.categoryName}</p>
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
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(category.budgetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent:</span>
                    <span
                      className={`font-medium ${
                        category.isOverBudget
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-foreground'
                      }`}
                    >
                      {formatCurrency(category.spent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining:</span>
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
                      <span className="text-xs text-muted-foreground">Usage</span>
                      <span className="text-xs font-medium text-foreground">
                        {category.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
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
          className="surface-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Expenses by Category</h2>
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
                formatter={(value) => formatCurrency(Number(value))}
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
          className="surface-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Monthly Breakdown</h2>
          <div className="space-y-3">
            {expenseStats.monthlyBreakdown.map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl surface-inner">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{month.month}</span>
                </div>
                <span className="font-bold text-foreground">
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

