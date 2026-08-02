'use client'
import React, { useEffect, useState } from 'react'
import { Plus, IndianRupee, Repeat, Calendar, Edit, Trash2, TrendingUp, Clock } from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'
import { format, addDays, addWeeks, addMonths, addQuarters, isAfter, isBefore } from 'date-fns'
import { motion } from 'framer-motion'
import { AddButton } from '@/components/ui/AddButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, Tab } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormSheet } from '@/components/ui/form-sheet'
import { FAB } from '@/components/ui/fab'
import { SwipeableRow, DesktopRowActions } from '@/components/ui/swipeable-row'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useDocumentTitle } from '@/lib/hooks/useDocumentTitle'

const SalaryRecurringPage = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('salary')
  useDocumentTitle(
    activeTab === 'salary' ? 'Salary' : 'Recurring Expenses',
    'Salary & Recurring',
  )
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  
  // Salary states
  const [salaries, setSalaries] = useState([])
  const [salaryLoading, setSalaryLoading] = useState(true)
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false)
  const [editingSalary, setEditingSalary] = useState(null)
  const [salaryFormData, setSalaryFormData] = useState({
    amount: '',
    currency: 'INR',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    description: '',
    accountId: '',
    categoryId: '',
  })

  // Recurring expense states
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [expenseLoading, setExpenseLoading] = useState(true)
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [expenseFormData, setExpenseFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    customDays: '',
    dayOfWeek: '',
    dayOfMonth: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    categoryId: '',
    accountId: '',
    isCash: false,
    description: '',
    autoCreateTransaction: false,
  })

  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    if (user) {
      fetchSalaries()
      fetchRecurringExpenses()
      fetchCategories()
      fetchAccounts()
    }
  }, [user])

  const fetchSalaries = async () => {
    try {
      setSalaryLoading(true)
      const response = await request.get('/api/salary')
      setSalaries(response.data)
    } catch (error) {
      toast.error('Failed to load salaries')
    } finally {
      setSalaryLoading(false)
    }
  }

  const fetchRecurringExpenses = async () => {
    try {
      setExpenseLoading(true)
      const response = await request.get('/api/recurring-expenses')
      setRecurringExpenses(response.data)
    } catch (error) {
      toast.error('Failed to load recurring expenses')
    } finally {
      setExpenseLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const [expenseCats, incomeCats] = await Promise.all([
        request.get('/api/categories?type=expense'),
        request.get('/api/categories?type=income'),
      ])
      setCategories([...expenseCats.data, ...incomeCats.data])
    } catch (error) {
      // Error handled silently
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await request.get('/api/bank-accounts')
      setAccounts(response.data)
    } catch (error) {
      // Error handled silently
    }
  }

  const handleSalarySubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSalary) {
        await request.put(`/api/salary/${editingSalary._id}`, salaryFormData)
        toast.success('Salary updated successfully')
      } else {
        await request.post('/api/salary', salaryFormData)
        toast.success('Salary added successfully')
      }
      setIsSalaryDialogOpen(false)
      resetSalaryForm()
      fetchSalaries()
    } catch (error) {
      toast.error('Failed to save salary')
    }
  }

  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...expenseFormData,
        customDays: expenseFormData.frequency === 'custom' ? parseInt(expenseFormData.customDays) : null,
        dayOfWeek: expenseFormData.frequency === 'weekly' ? parseInt(expenseFormData.dayOfWeek) : null,
        dayOfMonth: ['monthly', 'quarterly'].includes(expenseFormData.frequency) ? parseInt(expenseFormData.dayOfMonth) : null,
      }

      if (editingExpense) {
        await request.put(`/api/recurring-expenses/${editingExpense._id}`, payload)
        toast.success('Recurring expense updated successfully')
      } else {
        await request.post('/api/recurring-expenses', payload)
        toast.success('Recurring expense created successfully')
      }
      setIsExpenseDialogOpen(false)
      resetExpenseForm()
      fetchRecurringExpenses()
    } catch (error) {
      toast.error('Failed to save recurring expense')
    }
  }

  const handleSalaryDelete = (id) => {
    confirmDelete({
      title: 'Delete Salary',
      description: 'Are you sure you want to delete this salary?',
      onConfirm: async () => {
        await request.delete(`/api/salary/${id}`)
        toast.success('Salary deleted successfully')
        fetchSalaries()
      },
    })
  }

  const handleExpenseDelete = (id) => {
    confirmDelete({
      title: 'Delete Recurring Expense',
      description: 'Are you sure you want to delete this recurring expense?',
      onConfirm: async () => {
        await request.delete(`/api/recurring-expenses/${id}`)
        toast.success('Recurring expense deleted successfully')
        fetchRecurringExpenses()
      },
    })
  }

  const handleSalaryEdit = (salary) => {
    setEditingSalary(salary)
    setSalaryFormData({
      amount: salary.amount,
      currency: salary.currency || 'INR',
      frequency: salary.frequency,
      startDate: format(new Date(salary.startDate), 'yyyy-MM-dd'),
      endDate: salary.endDate ? format(new Date(salary.endDate), 'yyyy-MM-dd') : '',
      description: salary.description || '',
      accountId: salary.accountId?._id || '',
      categoryId: salary.categoryId?._id || '',
    })
    setIsSalaryDialogOpen(true)
  }

  const handleExpenseEdit = (expense) => {
    setEditingExpense(expense)
    setExpenseFormData({
      name: expense.name,
      amount: expense.amount,
      frequency: expense.frequency,
      customDays: expense.customDays?.toString() || '',
      dayOfWeek: expense.dayOfWeek?.toString() || '',
      dayOfMonth: expense.dayOfMonth?.toString() || '',
      startDate: format(new Date(expense.startDate), 'yyyy-MM-dd'),
      endDate: expense.endDate ? format(new Date(expense.endDate), 'yyyy-MM-dd') : '',
      categoryId: expense.categoryId._id,
      accountId: expense.accountId?._id || '',
      isCash: expense.isCash,
      description: expense.description || '',
      autoCreateTransaction: expense.autoCreateTransaction || false,
    })
    setIsExpenseDialogOpen(true)
  }

  const resetSalaryForm = () => {
    setSalaryFormData({
      amount: '',
      currency: 'INR',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      description: '',
      accountId: '',
      categoryId: '',
    })
    setEditingSalary(null)
  }

  const resetExpenseForm = () => {
    setExpenseFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      customDays: '',
      dayOfWeek: '',
      dayOfMonth: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      categoryId: '',
      accountId: '',
      isCash: false,
      description: '',
      autoCreateTransaction: false,
    })
    setEditingExpense(null)
  }

  const getFrequencyLabel = (frequency) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      custom: 'Custom',
    }
    return labels[frequency] || frequency
  }

  const getUpcomingExpenses = () => {
    const now = new Date()
    const nextWeek = addDays(now, 7)
    return recurringExpenses
      .filter((exp) => exp.isActive && isAfter(new Date(exp.nextDueDate), now))
      .filter((exp) => isBefore(new Date(exp.nextDueDate), nextWeek))
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
  }

  const upcomingExpenses = getUpcomingExpenses()

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Salary & Recurring Expenses"
        subtitle="Manage your salary and recurring expenses"
        showBack
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tab value="salary" activeValue={activeTab} onValueChange={setActiveTab} icon={IndianRupee}>
          Salary
        </Tab>
        <Tab value="recurring" activeValue={activeTab} onValueChange={setActiveTab} icon={Repeat}>
          Recurring Expenses
        </Tab>
      </Tabs>

      <FormSheet
        open={isSalaryDialogOpen}
        onOpenChange={setIsSalaryDialogOpen}
        title={editingSalary ? 'Edit Salary' : 'Add Salary'}
      >
        <form onSubmit={handleSalarySubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input
              type="number"
              value={salaryFormData.amount}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, amount: e.target.value })}
              required
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Frequency</label>
            <select
              value={salaryFormData.frequency}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, frequency: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="monthly">Monthly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <Input
              type="date"
              value={salaryFormData.startDate}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, startDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">End Date (Optional)</label>
            <Input
              type="date"
              value={salaryFormData.endDate}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category (Optional)</label>
            <select
              value={salaryFormData.categoryId}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, categoryId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select category</option>
              {categories.filter(cat => cat.type === 'income').map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Account (Optional)</label>
            <select
              value={salaryFormData.accountId}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, accountId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.icon} {acc.accountName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
            <Input
              value={salaryFormData.description}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, description: e.target.value })}
              placeholder="e.g., Software Engineer Salary"
            />
          </div>
          <FormButtonGroup
            submitLabel={editingSalary ? 'Update Salary' : 'Add Salary'}
            onCancel={() => setIsSalaryDialogOpen(false)}
          />
        </form>
      </FormSheet>

      <FormSheet
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        title={editingExpense ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              value={expenseFormData.name}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, name: e.target.value })}
              required
              placeholder="e.g., Rent, Netflix Subscription"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input
              type="number"
              value={expenseFormData.amount}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
              required
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Frequency</label>
            <select
              value={expenseFormData.frequency}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, frequency: e.target.value, customDays: '', dayOfWeek: '', dayOfMonth: '' })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {expenseFormData.frequency === 'custom' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Repeat Every (Days)</label>
              <Input
                type="number"
                value={expenseFormData.customDays}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, customDays: e.target.value })}
                required
                min="1"
                placeholder="e.g., 15 for every 15 days"
              />
            </div>
          )}
          {expenseFormData.frequency === 'weekly' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Day of Week</label>
              <select
                value={expenseFormData.dayOfWeek}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, dayOfWeek: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Any day</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
          )}
          {['monthly', 'quarterly'].includes(expenseFormData.frequency) && (
            <div>
              <label className="text-sm font-medium mb-1 block">Day of Month</label>
              <Input
                type="number"
                value={expenseFormData.dayOfMonth}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, dayOfMonth: e.target.value })}
                min="1"
                max="31"
                placeholder="e.g., 1 for 1st of month"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <Input
              type="date"
              value={expenseFormData.startDate}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, startDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">End Date (Optional)</label>
            <Input
              type="date"
              value={expenseFormData.endDate}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <select
              value={expenseFormData.categoryId}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, categoryId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select category</option>
              {categories.filter(cat => cat.type === 'expense').map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Payment Method</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={expenseFormData.isCash ? 'default' : 'outline'}
                onClick={() => setExpenseFormData({ ...expenseFormData, isCash: true, accountId: '' })}
                className="flex-1"
              >
                Cash
              </Button>
              <Button
                type="button"
                variant={!expenseFormData.isCash ? 'default' : 'outline'}
                onClick={() => setExpenseFormData({ ...expenseFormData, isCash: false })}
                className="flex-1"
              >
                Bank Account
              </Button>
            </div>
          </div>
          {!expenseFormData.isCash && (
            <div>
              <label className="text-sm font-medium mb-1 block">Account</label>
              <select
                value={expenseFormData.accountId}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, accountId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required={!expenseFormData.isCash}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.icon} {acc.accountName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
            <Input
              value={expenseFormData.description}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
              placeholder="Additional notes"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoCreate"
              checked={expenseFormData.autoCreateTransaction}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, autoCreateTransaction: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="autoCreate" className="text-sm text-foreground">
              Automatically create transactions when due
            </label>
          </div>
          <FormButtonGroup
            submitLabel={editingExpense ? 'Update Recurring Expense' : 'Create Recurring Expense'}
            onCancel={() => setIsExpenseDialogOpen(false)}
          />
        </form>
      </FormSheet>

      <FAB
        onClick={() => {
          if (activeTab === 'salary') {
            resetSalaryForm()
            setIsSalaryDialogOpen(true)
          } else {
            resetExpenseForm()
            setIsExpenseDialogOpen(true)
          }
        }}
        label={activeTab === 'salary' ? 'Add salary' : 'Add recurring expense'}
      />

      {/* Salary Tab */}
      {activeTab === 'salary' && (
        <div className="space-y-4">
          <div className="flex justify-end hidden md:flex">
            <AddButton onClick={() => { resetSalaryForm(); setIsSalaryDialogOpen(true) }}>
              Add Salary
            </AddButton>
          </div>

          {/* Salary List */}
          {salaryLoading ? (
            // Show skeletons while loading
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="surface-card p-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-muted"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))
          ) : salaries.length === 0 ? (
            <EmptyState
              icon={IndianRupee}
              title="No salary records yet"
              description="Add your salary to get started"
              actionLabel="Add Your First Salary"
              onAction={() => {
                resetSalaryForm()
                setEditingSalary(null)
                setIsSalaryDialogOpen(true)
              }}
            />
          ) : (
            <div className="space-y-3">
              {salaries.map((salary) => (
                <Card
                  key={salary._id}
                  delay={0.1}
                  hover={true}
                  className="p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <IndianRupee className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {formatCurrency(salary.amount)} / {getFrequencyLabel(salary.frequency)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {salary.description || 'Salary'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Started: {format(new Date(salary.startDate), 'MMM dd, yyyy')}
                            {salary.endDate && ` • Ends: ${format(new Date(salary.endDate), 'MMM dd, yyyy')}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <EditButton onClick={() => handleSalaryEdit(salary)} />
                      <DeleteButton onClick={() => handleSalaryDelete(salary._id)} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recurring Expenses Tab */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          {/* Upcoming Expenses Alert */}
          {upcomingExpenses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Upcoming This Week</h3>
              </div>
              <div className="space-y-2">
                {upcomingExpenses.map((exp) => (
                  <div key={exp._id} className="flex items-center justify-between text-sm">
                    <span className="text-blue-800 dark:text-blue-200">
                      {exp.name} - {formatCurrency(exp.amount)}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {format(new Date(exp.nextDueDate), 'MMM dd')}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex justify-end hidden md:flex">
            <Button
              onClick={() => { resetExpenseForm(); setIsExpenseDialogOpen(true) }}
              className="bg-primary hover:bg-primary/90 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recurring Expense
            </Button>
          </div>

          {/* Recurring Expenses List */}
          {expenseLoading ? (
            // Show skeletons while loading
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="surface-card p-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-muted"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))
          ) : recurringExpenses.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No recurring expenses yet"
              description="Add recurring expenses to track them automatically"
              actionLabel="Add Your First Recurring Expense"
              onAction={() => {
                resetExpenseForm()
                setEditingExpense(null)
                setIsExpenseDialogOpen(true)
              }}
            />
          ) : (
            <div className="space-y-3">
              {recurringExpenses.map((expense) => (
                <Card
                  key={expense._id}
                  delay={0.1}
                  hover={true}
                  className="p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <Repeat className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {expense.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(expense.amount)} • {getFrequencyLabel(expense.frequency)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Next due: {format(new Date(expense.nextDueDate), 'MMM dd, yyyy')}
                            {expense.categoryId && ` • ${expense.categoryId.name}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <EditButton onClick={() => handleExpenseEdit(expense)} />
                      <DeleteButton onClick={() => handleExpenseDelete(expense._id)} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default SalaryRecurringPage

