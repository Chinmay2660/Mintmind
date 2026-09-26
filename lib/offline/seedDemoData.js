import { buildDemoLoanPayments } from '@/lib/seed/demoLoanPayments'
import { clearOfflineData, db, setMeta } from './db'
import { upsertMany, upsertSingleton } from './repository'

const DEMO = {
  catSalary: 'demo_cat_salary',
  catFreelance: 'demo_cat_freelance',
  catFood: 'demo_cat_food',
  catTransport: 'demo_cat_transport',
  catShopping: 'demo_cat_shopping',
  catBills: 'demo_cat_bills',
  catEntertainment: 'demo_cat_entertainment',
  catHealthcare: 'demo_cat_healthcare',
  catEducation: 'demo_cat_education',
  catRent: 'demo_cat_rent',
  accHdfc: 'demo_acc_hdfc',
  accSbi: 'demo_acc_sbi',
  accIcici: 'demo_acc_icici',
  accCcHdfc: 'demo_acc_cc_hdfc',
  accCcSbi: 'demo_acc_cc_sbi',
  familyId: 'demo_family',
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

function monthRange(offset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { start: start.toISOString(), end: end.toISOString() }
}

function synced(createdAt = new Date().toISOString()) {
  return { _syncStatus: 'synced', createdAt, updatedAt: createdAt }
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function buildDemoTransactions(s) {
  const txs = []
  let seq = 1
  const nextId = () => `demo_tx_${seq++}`

  const expensePool = [
    { categoryId: DEMO.catFood, accountId: DEMO.accHdfc, amounts: [450, 320, 1800, 650, 920], descriptions: ['Lunch at cafe', 'Coffee & snacks', 'Groceries', 'Dinner out', 'Food delivery'] },
    { categoryId: DEMO.catTransport, accountId: DEMO.accHdfc, amounts: [1200, 350, 1500, 80], descriptions: ['Uber rides', 'Metro pass', 'Petrol', 'Auto fare'] },
    { categoryId: DEMO.catShopping, accountId: DEMO.accSbi, amounts: [3200, 5500, 1200, 890], descriptions: ['Amazon order', 'New headphones', 'Clothing', 'Home supplies'] },
    { categoryId: DEMO.catBills, accountId: DEMO.accHdfc, amounts: [2500, 4200, 899, 1500], descriptions: ['Electricity bill', 'Internet + mobile', 'Streaming bundle', 'Gas cylinder'] },
    { categoryId: DEMO.catEntertainment, accountId: DEMO.accHdfc, amounts: [899, 2100, 450, 1200], descriptions: ['Netflix + Spotify', 'Movie night', 'Concert tickets', 'Gaming subscription'] },
    { categoryId: DEMO.catHealthcare, accountId: DEMO.accSbi, amounts: [800, 2500, 350], descriptions: ['Pharmacy', 'Doctor visit', 'Vitamins'] },
    { categoryId: DEMO.catEducation, accountId: DEMO.accHdfc, amounts: [5000, 1200, 3500], descriptions: ['Online course', 'Books', 'Workshop fee'] },
    { categoryId: DEMO.catRent, accountId: DEMO.accHdfc, amounts: [18000], descriptions: ['Monthly rent'] },
  ]

  // Last 7 days — at least one expense per day for the activity chart
  const weekExpenses = [
    { day: 0, categoryId: DEMO.catFood, amount: 450, description: 'Lunch at cafe', tagIds: ['demo_tag_1'] },
    { day: 1, categoryId: DEMO.catTransport, amount: 1200, description: 'Uber rides' },
    { day: 2, categoryId: DEMO.catShopping, amount: 3200, description: 'Amazon order', tagIds: ['demo_tag_2'] },
    { day: 3, categoryId: DEMO.catFood, amount: 650, description: 'Coffee & snacks' },
    { day: 4, categoryId: DEMO.catBills, amount: 2500, description: 'Electricity bill', tagIds: ['demo_tag_1'] },
    { day: 5, categoryId: DEMO.catEntertainment, amount: 899, description: 'Netflix + Spotify' },
    { day: 6, categoryId: DEMO.catFood, amount: 1800, description: 'Groceries (cash)', isCash: true, accountId: null },
  ]

  weekExpenses.forEach(({ day, categoryId, amount, description, isCash = false, accountId = DEMO.accHdfc, tagIds = [] }) => {
    txs.push({
      _id: nextId(),
      type: 'expense',
      amount,
      categoryId,
      accountId,
      isCash,
      description,
      tagIds,
      date: daysAgo(day),
      ...s,
    })
  })

  // 6 months of salary, freelance, rent, and varied expenses
  for (let month = 0; month < 6; month++) {
    const salaryDay = month * 30 + 1
    txs.push({
      _id: nextId(),
      type: 'income',
      amount: 85000,
      categoryId: DEMO.catSalary,
      accountId: DEMO.accHdfc,
      isCash: false,
      description: 'Monthly salary',
      date: daysAgo(salaryDay),
      ...s,
    })

    if (month % 2 === 0) {
      txs.push({
        _id: nextId(),
        type: 'income',
        amount: 15000,
        categoryId: DEMO.catFreelance,
        accountId: DEMO.accSbi,
        isCash: false,
        description: 'Freelance project',
        date: daysAgo(salaryDay + 5),
        ...s,
      })
    }

    txs.push({
      _id: nextId(),
      type: 'expense',
      amount: 18000,
      categoryId: DEMO.catRent,
      accountId: DEMO.accHdfc,
      isCash: false,
      description: 'Monthly rent',
      date: daysAgo(salaryDay + 2),
      ...s,
    })

    if (month > 0) {
      txs.push({
        _id: nextId(),
        type: 'transfer',
        amount: 10000,
        accountId: DEMO.accHdfc,
        transferToAccountId: DEMO.accSbi,
        transferToIsCash: false,
        isCash: false,
        description: 'Savings transfer',
        date: daysAgo(salaryDay + 8),
        ...s,
      })
    }

    const expensesThisMonth = 6 + (month % 3)
    for (let i = 0; i < expensesThisMonth; i++) {
      const template = pick(expensePool.filter((e) => e.categoryId !== DEMO.catRent))
      const amount = pick(template.amounts)
      const description = pick(template.descriptions)
      const dayOffset = salaryDay + 3 + i * 4
      if (dayOffset <= 6) continue // skip week already covered

      txs.push({
        _id: nextId(),
        type: 'expense',
        amount,
        categoryId: template.categoryId,
        accountId: template.accountId,
        isCash: false,
        description,
        date: daysAgo(dayOffset),
        ...s,
      })
    }
  }

  return txs
}

export function isDemoModeEnabled() {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  )
}

export async function isDemoDataEmpty() {
  if (!db) return false
  const count = await db.categories.count()
  return count === 0
}

export async function hasDemoData() {
  if (!db) return false
  const seeded = await db.meta.get('demoDataSeeded')
  return seeded?.value === 'true'
}

export async function seedDemoData(userId) {
  if (!db || !userId) return false

  const now = new Date().toISOString()
  const { start: monthStart, end: monthEnd } = monthRange()
  const { start: quarterStart, end: quarterEnd } = monthRange(-2)
  const s = synced(now)

  const categories = [
    { _id: DEMO.catSalary, name: 'Salary', type: 'income', icon: '💼', color: '#22c55e', budget: 0, ...s },
    { _id: DEMO.catFreelance, name: 'Freelance', type: 'income', icon: '💻', color: '#10b981', budget: 0, ...s },
    { _id: DEMO.catFood, name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#f97316', budget: 8000, ...s },
    { _id: DEMO.catTransport, name: 'Transport', type: 'expense', icon: '🚗', color: '#3b82f6', budget: 3000, ...s },
    { _id: DEMO.catShopping, name: 'Shopping', type: 'expense', icon: '🛍️', color: '#a855f7', budget: 5000, ...s },
    { _id: DEMO.catBills, name: 'Bills & Utilities', type: 'expense', icon: '💡', color: '#eab308', budget: 4000, ...s },
    { _id: DEMO.catEntertainment, name: 'Entertainment', type: 'expense', icon: '🎬', color: '#ec4899', budget: 2000, ...s },
    { _id: DEMO.catHealthcare, name: 'Healthcare', type: 'expense', icon: '🏥', color: '#ef4444', budget: 3000, ...s },
    { _id: DEMO.catEducation, name: 'Education', type: 'expense', icon: '📚', color: '#6366f1', budget: 5000, ...s },
    { _id: DEMO.catRent, name: 'Rent', type: 'expense', icon: '🏠', color: '#78716c', budget: 18000, ...s },
  ]

  const bankAccounts = [
    {
      _id: DEMO.accHdfc,
      accountName: 'HDFC Bank - Savings',
      bankName: 'HDFC Bank',
      accountNumber: '****4521',
      accountType: 'Savings',
      ownershipType: 'Joint',
      jointHolders: 'Priya Sharma',
      operationMode: 'Either or Survivor',
      ifscCode: 'HDFC0000240',
      branch: 'Andheri West, Mumbai',
      nomineeName: 'Priya Sharma',
      balance: 125000,
      color: '#2563eb',
      icon: '🏦',
      ...s,
    },
    {
      _id: DEMO.accSbi,
      accountName: 'State Bank of India - Current',
      bankName: 'State Bank of India',
      accountNumber: '****8834',
      accountType: 'Current',
      ownershipType: 'Individual',
      ifscCode: 'SBIN0001234',
      branch: 'Fort, Mumbai',
      balance: 45000,
      color: '#0ea5e9',
      icon: '🏛️',
      ...s,
    },
    // Credit-card mirror accounts (one per credit card below).
    {
      _id: DEMO.accIcici,
      accountName: 'ICICI Amazon Pay',
      bankName: 'ICICI Bank',
      accountNumber: '2290',
      accountType: 'Credit Card',
      balance: -12500,
      color: '#f97316',
      icon: '💳',
      ...s,
    },
    {
      _id: DEMO.accCcHdfc,
      accountName: 'HDFC Regalia',
      bankName: 'HDFC Bank',
      accountNumber: '4521',
      accountType: 'Credit Card',
      balance: -18500,
      color: '#7c3aed',
      icon: '💳',
      ...s,
    },
    {
      _id: DEMO.accCcSbi,
      accountName: 'SBI SimplyCLICK',
      bankName: 'SBI Card',
      accountNumber: '8834',
      accountType: 'Credit Card',
      balance: -8200,
      color: '#2563eb',
      icon: '💳',
      ...s,
    },
  ]

  const transactions = buildDemoTransactions(s)

  const budgets = [
    { _id: 'demo_budget_1', categoryId: DEMO.catFood, name: 'Food budget', amount: 8000, period: 'monthly', startDate: monthStart, endDate: monthEnd, isActive: true, description: 'Monthly food limit', ...s },
    { _id: 'demo_budget_2', categoryId: DEMO.catTransport, name: 'Transport budget', amount: 3000, period: 'monthly', startDate: monthStart, endDate: monthEnd, isActive: true, ...s },
    { _id: 'demo_budget_3', categoryId: DEMO.catShopping, name: 'Shopping budget', amount: 5000, period: 'monthly', startDate: monthStart, endDate: monthEnd, isActive: true, ...s },
    { _id: 'demo_budget_4', categoryId: DEMO.catHealthcare, name: 'Healthcare budget', amount: 3000, period: 'quarterly', startDate: quarterStart, endDate: quarterEnd, isActive: true, ...s },
    { _id: 'demo_budget_5', categoryId: DEMO.catEducation, name: 'Learning budget', amount: 15000, period: 'yearly', startDate: monthRange(-11).start, endDate: monthEnd, isActive: true, description: 'Courses and books', ...s },
  ]

  const investments = [
    { _id: 'demo_inv_1', type: 'Mutual Fund', name: 'Nifty 50 Index Fund', amount: 50000, investedDate: daysAgo(180), maturityType: 'Ongoing', currentValue: 58000, interestRate: 12.5, accountId: DEMO.accHdfc, notes: 'SIP ongoing', ...s },
    { _id: 'demo_inv_2', type: 'FD', name: 'HDFC Fixed Deposit', amount: 100000, investedDate: daysAgo(90), maturityDate: daysAgo(-275), maturityType: 'Maturity', currentValue: 106000, interestRate: 7.1, accountId: DEMO.accHdfc, ...s },
    { _id: 'demo_inv_3', type: 'Gold ETF', name: 'SBI Gold ETF', amount: 25000, investedDate: daysAgo(60), maturityType: 'Ongoing', currentValue: 27200, accountId: DEMO.accSbi, ...s },
    { _id: 'demo_inv_4', type: 'Stock', name: 'Reliance Industries', amount: 35000, investedDate: daysAgo(120), maturityType: 'Ongoing', currentValue: 41200, interestRate: 17.7, accountId: DEMO.accSbi, notes: 'Long-term hold', ...s },
    { _id: 'demo_inv_5', type: 'EPF', name: 'Employee Provident Fund', amount: 180000, investedDate: daysAgo(730), maturityType: 'Ongoing', currentValue: 215000, interestRate: 8.25, accountId: DEMO.accHdfc, notes: 'Employer matched', ...s },
  ]

  const creditCards = [
    { _id: 'demo_cc_1', cardName: 'HDFC Regalia', issuer: 'HDFC Bank', cardType: 'Visa', lastFourDigits: '4521', creditLimit: 300000, currentBalance: 18500, statementDay: 5, dueDay: 25, apr: 42, rewardsProgram: 'Regalia Points', accountId: DEMO.accCcHdfc, color: '#7c3aed', ...s },
    { _id: 'demo_cc_2', cardName: 'SBI SimplyCLICK', issuer: 'SBI Card', cardType: 'Visa', lastFourDigits: '8834', creditLimit: 150000, currentBalance: 8200, statementDay: 15, dueDay: 5, apr: 45, accountId: DEMO.accCcSbi, color: '#2563eb', ...s },
    { _id: 'demo_cc_3', cardName: 'ICICI Amazon Pay', issuer: 'ICICI Bank', cardType: 'Visa', lastFourDigits: '2290', creditLimit: 200000, currentBalance: 12500, statementDay: 10, dueDay: 28, apr: 43, rewardsProgram: 'Amazon Pay cashback', accountId: DEMO.accIcici, color: '#f97316', ...s },
  ]

  const insurance = [
    { _id: 'demo_ins_1', type: 'Health', name: 'Family Health Cover', policyNumber: 'HLTH-2024-001', premium: 24000, premiumFrequency: 'Yearly', startDate: daysAgo(200), renewalDate: daysAgo(-165), coverageAmount: 1000000, accountId: DEMO.accHdfc, isActive: true, ...s },
    { _id: 'demo_ins_2', type: 'Term Insurance', name: 'Life Term Plan', policyNumber: 'LIFE-2023-042', premium: 18000, premiumFrequency: 'Yearly', startDate: daysAgo(400), renewalDate: daysAgo(-330), coverageAmount: 5000000, accountId: DEMO.accHdfc, isActive: true, ...s },
    { _id: 'demo_ins_3', type: 'Motor', name: 'Car Insurance', policyNumber: 'MOTOR-2025-118', premium: 8500, premiumFrequency: 'Yearly', startDate: daysAgo(100), renewalDate: daysAgo(-265), coverageAmount: 800000, accountId: DEMO.accSbi, isActive: true, ...s },
    { _id: 'demo_ins_4', type: 'Home', name: 'Home Insurance', policyNumber: 'HOME-2024-055', premium: 6000, premiumFrequency: 'Yearly', startDate: daysAgo(150), renewalDate: daysAgo(-215), coverageAmount: 2500000, accountId: DEMO.accHdfc, isActive: true, notes: 'Covers structure and contents', ...s },
  ]

  const salary = [
    { _id: 'demo_salary_1', amount: 85000, currency: 'INR', frequency: 'monthly', startDate: daysAgo(365), endDate: null, isActive: true, description: 'Primary job salary', accountId: DEMO.accHdfc, categoryId: DEMO.catSalary, ...s },
    { _id: 'demo_salary_2', amount: 15000, currency: 'INR', frequency: 'monthly', startDate: daysAgo(180), endDate: null, isActive: true, description: 'Freelance retainer', accountId: DEMO.accSbi, categoryId: DEMO.catFreelance, ...s },
  ]

  const recurringExpenses = [
    { _id: 'demo_re_1', name: 'Netflix', amount: 649, frequency: 'monthly', dayOfMonth: 5, startDate: daysAgo(180), endDate: null, nextDueDate: daysAgo(-5), categoryId: DEMO.catEntertainment, accountId: DEMO.accHdfc, isCash: false, isActive: true, autoCreateTransaction: true, ...s },
    { _id: 'demo_re_2', name: 'Gym membership', amount: 1500, frequency: 'monthly', dayOfMonth: 1, startDate: daysAgo(90), endDate: null, nextDueDate: daysAgo(-8), categoryId: DEMO.catEntertainment, accountId: DEMO.accHdfc, isCash: false, isActive: true, ...s },
    { _id: 'demo_re_3', name: 'Rent', amount: 18000, frequency: 'monthly', dayOfMonth: 1, startDate: daysAgo(365), endDate: null, nextDueDate: daysAgo(-8), categoryId: DEMO.catRent, accountId: DEMO.accHdfc, isCash: false, isActive: true, autoCreateTransaction: true, ...s },
    { _id: 'demo_re_4', name: 'Spotify', amount: 119, frequency: 'monthly', dayOfMonth: 12, startDate: daysAgo(200), endDate: null, nextDueDate: daysAgo(-3), categoryId: DEMO.catEntertainment, accountId: DEMO.accHdfc, isCash: false, isActive: true, autoCreateTransaction: true, ...s },
    { _id: 'demo_re_5', name: 'Health insurance premium', amount: 2000, frequency: 'monthly', dayOfMonth: 15, startDate: daysAgo(300), endDate: null, nextDueDate: daysAgo(-7), categoryId: DEMO.catHealthcare, accountId: DEMO.accSbi, isCash: false, isActive: true, ...s },
  ]

  const userRef = { _id: userId, name: 'Demo User', email: 'demo@mintmind.app' }

  const familyGoals = [
    { _id: 'demo_fg_1', familyId: DEMO.familyId, title: 'Europe Vacation', description: 'Summer trip fund', targetAmount: 200000, currentAmount: 75000, targetDate: daysAgo(-120), category: 'savings', status: 'active', createdBy: userId, memberSplits: [{ user: userId, percentage: 100, targetAmount: 200000, currentAmount: 75000 }], ...s },
    { _id: 'demo_fg_2', familyId: DEMO.familyId, title: 'Home Renovation', targetAmount: 500000, currentAmount: 120000, targetDate: daysAgo(-300), category: 'expense', status: 'active', createdBy: userId, memberSplits: [{ user: userId, percentage: 100, targetAmount: 500000, currentAmount: 120000 }], ...s },
    { _id: 'demo_fg_3', familyId: DEMO.familyId, title: 'Kids Education Fund', description: 'College savings', targetAmount: 1000000, currentAmount: 250000, targetDate: daysAgo(-720), category: 'savings', status: 'active', createdBy: userId, memberSplits: [{ user: userId, percentage: 100, targetAmount: 1000000, currentAmount: 250000 }], ...s },
  ]

  const familyBudgets = [
    { _id: 'demo_fb_1', familyId: DEMO.familyId, categoryName: 'Groceries', amount: 12000, period: 'monthly', startDate: monthStart, endDate: monthEnd, createdBy: userId, ...s },
    { _id: 'demo_fb_2', familyId: DEMO.familyId, categoryName: 'Kids Education', amount: 25000, period: 'monthly', startDate: monthStart, endDate: monthEnd, createdBy: userId, ...s },
    { _id: 'demo_fb_3', familyId: DEMO.familyId, categoryName: 'Utilities', amount: 8000, period: 'monthly', startDate: monthStart, endDate: monthEnd, createdBy: userId, ...s },
  ]

  const familyExpenses = [
    { _id: 'demo_fe_1', familyId: DEMO.familyId, title: 'Weekly groceries', amount: 3500, category: 'Groceries', date: daysAgo(2), paidBy: userId, createdBy: userId, ...s },
    { _id: 'demo_fe_2', familyId: DEMO.familyId, title: 'School fees', amount: 12000, category: 'Education', date: daysAgo(10), paidBy: userId, createdBy: userId, ...s },
    { _id: 'demo_fe_3', familyId: DEMO.familyId, title: 'Family dinner', amount: 2800, category: 'Food', date: daysAgo(5), paidBy: userId, createdBy: userId, ...s },
    { _id: 'demo_fe_4', familyId: DEMO.familyId, title: 'Electricity bill', amount: 4200, category: 'Utilities', date: daysAgo(15), paidBy: userId, createdBy: userId, ...s },
    { _id: 'demo_fe_5', familyId: DEMO.familyId, title: 'Kids sports class', amount: 2500, category: 'Education', date: daysAgo(8), paidBy: userId, createdBy: userId, ...s },
  ]

  const tags = [
    { _id: 'demo_tag_1', name: 'Essential', color: '#22c55e', ...s },
    { _id: 'demo_tag_2', name: 'Discretionary', color: '#f97316', ...s },
    { _id: 'demo_tag_3', name: 'Tax Deductible', color: '#6366f1', ...s },
    { _id: 'demo_tag_4', name: 'Work', color: '#3b82f6', ...s },
    { _id: 'demo_tag_5', name: 'Family', color: '#ec4899', ...s },
  ]

  const goals = [
    { _id: 'demo_goal_1', title: 'Europe Vacation', description: 'Summer trip fund', targetAmount: 200000, currentAmount: 75000, targetDate: daysAgo(-120), category: 'vacation', monthlyContribution: 8000, expectedReturn: 8, status: 'active', ...s },
    { _id: 'demo_goal_2', title: 'New Car', targetAmount: 800000, currentAmount: 150000, targetDate: daysAgo(-300), category: 'car', monthlyContribution: 15000, expectedReturn: 7, status: 'active', ...s },
    { _id: 'demo_goal_3', title: 'Emergency Fund', description: '6 months expenses', targetAmount: 300000, currentAmount: 180000, targetDate: daysAgo(-60), category: 'emergency', monthlyContribution: 10000, expectedReturn: 6, status: 'active', ...s },
    { _id: 'demo_goal_4', title: 'Home Down Payment', targetAmount: 1500000, currentAmount: 320000, targetDate: daysAgo(-540), category: 'house', monthlyContribution: 25000, expectedReturn: 9, status: 'active', ...s },
  ]

  const loans = [
    {
      _id: 'demo_loan_1',
      name: 'Home Loan',
      type: 'home',
      lender: 'HDFC Bank',
      principal: 4500000,
      outstanding: 3800000,
      interestRate: 8.5,
      emi: 38500,
      currentEmi: 42000,
      tenureMonths: 240,
      remainingMonths: 198,
      startDate: daysAgo(500),
      accountId: DEMO.accHdfc,
      ownership: 'joint',
      coBorrowers: [{ name: 'Priya Bhoir', sharePercent: 50 }],
      notes: '20-year tenure',
      ...s,
    },
    {
      _id: 'demo_loan_2',
      name: 'Car Loan',
      type: 'car',
      lender: 'SBI',
      principal: 600000,
      outstanding: 320000,
      interestRate: 9.2,
      emi: 12500,
      tenureMonths: 60,
      remainingMonths: 28,
      startDate: daysAgo(400),
      accountId: DEMO.accSbi,
      ...s,
    },
  ]

  const loanPayments = buildDemoLoanPayments({
    homeLoanId: 'demo_loan_1',
    carLoanId: 'demo_loan_2',
    homeAccountId: DEMO.accHdfc,
    carAccountId: DEMO.accSbi,
    daysAgo: (n) => daysAgo(n),
  }).map((payment, index) => ({
    _id: `demo_lp_${index + 1}`,
    ...payment,
    ...s,
  }))

  const subscriptions = [
    { _id: 'demo_sub_1', name: 'Netflix', amount: 649, frequency: 'monthly', nextBillingDate: daysAgo(-5), categoryId: DEMO.catEntertainment, accountId: DEMO.accHdfc, status: 'active', ...s },
    { _id: 'demo_sub_2', name: 'Spotify Premium', amount: 119, frequency: 'monthly', nextBillingDate: daysAgo(-12), categoryId: DEMO.catEntertainment, accountId: DEMO.accHdfc, status: 'active', ...s },
    { _id: 'demo_sub_3', name: 'Amazon Prime', amount: 1499, frequency: 'yearly', nextBillingDate: daysAgo(-90), categoryId: DEMO.catShopping, accountId: DEMO.accIcici, status: 'active', ...s },
    { _id: 'demo_sub_4', name: 'iCloud Storage', amount: 75, frequency: 'monthly', nextBillingDate: daysAgo(-20), categoryId: DEMO.catBills, accountId: DEMO.accHdfc, status: 'active', notes: '200GB plan', ...s },
  ]

  const reminders = [
    { _id: 'demo_rem_1', title: 'HDFC Regalia payment', type: 'credit_card', dueDate: daysAgo(-5), amount: 18500, status: 'upcoming', linkedId: 'demo_cc_1', linkedType: 'CreditCard', ...s },
    { _id: 'demo_rem_2', title: 'Home loan EMI', type: 'emi', dueDate: daysAgo(-3), amount: 38500, status: 'upcoming', linkedId: 'demo_loan_1', linkedType: 'Loan', ...s },
    { _id: 'demo_rem_3', title: 'Health insurance renewal', type: 'insurance', dueDate: daysAgo(-30), amount: 24000, status: 'upcoming', linkedId: 'demo_ins_1', linkedType: 'Insurance', ...s },
    { _id: 'demo_rem_4', title: 'Nifty 50 SIP', type: 'sip', dueDate: daysAgo(-7), amount: 5000, status: 'upcoming', linkedId: 'demo_inv_1', linkedType: 'Investment', ...s },
    { _id: 'demo_rem_5', title: 'Electricity bill', type: 'bill', dueDate: daysAgo(-2), amount: 2500, status: 'today', ...s },
  ]

  const rules = [
    { _id: 'demo_rule_1', name: 'Auto-categorize Uber', enabled: true, priority: 10, conditions: { field: 'description', operator: 'contains', value: 'Uber' }, actions: { categoryId: DEMO.catTransport, type: 'expense', tagIds: ['demo_tag_4'] }, ...s },
    { _id: 'demo_rule_2', name: 'Tag groceries', enabled: true, priority: 5, conditions: { field: 'description', operator: 'contains', value: 'Groceries' }, actions: { categoryId: DEMO.catFood, type: 'expense', tagIds: ['demo_tag_1'] }, ...s },
    { _id: 'demo_rule_3', name: 'Large expenses alert', enabled: true, priority: 1, conditions: { field: 'amount', operator: 'greaterThan', value: '10000' }, actions: { categoryId: DEMO.catShopping, type: 'expense' }, ...s },
  ]

  const sipPlans = [
    { _id: 'demo_sip_1', name: 'Nifty 50 SIP', investmentId: 'demo_inv_1', schemeCode: '120503', amount: 5000, frequency: 'monthly', nextDate: daysAgo(-7), accountId: DEMO.accHdfc, goalId: 'demo_goal_1', status: 'active', ...s },
    { _id: 'demo_sip_2', name: 'Gold ETF SIP', investmentId: 'demo_inv_3', amount: 2000, frequency: 'monthly', nextDate: daysAgo(-10), accountId: DEMO.accSbi, status: 'active', ...s },
  ]

  // Enrich MF investment for mutual funds tab
  investments[0] = {
    ...investments[0],
    assetClass: 'equity',
    schemeCode: '120503',
    amc: 'UTI',
    units: 450,
    purchaseNav: 111.11,
    currentNav: 128.89,
    navDate: daysAgo(1),
    sipAmount: 5000,
    goalId: 'demo_goal_1',
  }
  investments[2] = { ...investments[2], assetClass: 'gold' }
  investments[1] = { ...investments[1], assetClass: 'debt' }
  investments[3] = { ...investments[3], assetClass: 'equity' }
  investments[4] = { ...investments[4], assetClass: 'debt' }

  await Promise.all([
    upsertMany('categories', categories),
    upsertMany('bankAccounts', bankAccounts),
    upsertMany('transactions', transactions),
    upsertMany('budgets', budgets),
    upsertMany('investments', investments),
    upsertMany('creditCards', creditCards),
    upsertMany('debitCards', [
      { _id: 'demo_dc_1', accountId: DEMO.accHdfc, cardName: 'Millennia', network: 'Visa', lastFourDigits: '7781', expiry: '08/29', atmLimit: 50000, ...s },
      { _id: 'demo_dc_2', accountId: DEMO.accSbi, cardName: '', network: 'RuPay', lastFourDigits: '3310', expiry: '11/27', atmLimit: 25000, ...s },
    ]),
    upsertMany('insurance', insurance),
    upsertMany('salary', salary),
    upsertMany('recurringExpenses', recurringExpenses),
    upsertMany('familyGoals', familyGoals),
    upsertMany('familyBudgets', familyBudgets),
    upsertMany('familyExpenses', familyExpenses),
    upsertMany('tags', tags),
    upsertMany('goals', goals),
    upsertMany('loans', loans),
    upsertMany('loanPayments', loanPayments),
    upsertMany('subscriptions', subscriptions),
    upsertMany('reminders', reminders),
    upsertMany('rules', rules),
    upsertMany('sipPlans', sipPlans),
    upsertSingleton('cash', 'cash', { amount: 5000, currency: 'INR', ...s }),
    upsertSingleton('family', 'family', {
      _id: 'family',
      name: 'The Bhoir Family',
      familyHead: userRef,
      members: [{ user: userRef, role: 'head', status: 'active', joinedAt: now }],
      settings: { shareInvestments: true, shareExpenses: true, shareBudgets: true, shareSalary: true },
      ...s,
    }),
  ])

  await setMeta('demoDataSeeded', 'true')
  await setMeta('lastSyncedAt', new Date().toISOString())
  return true
}

export async function maybeSeedDemoData(userId, { force = false } = {}) {
  if (!isDemoModeEnabled()) return false
  if (!force && !(await isDemoDataEmpty())) return false
  if (force) await clearOfflineData()
  return seedDemoData(userId)
}
