import Category from '@/models/Category'
import Transaction from '@/models/Transaction'
import BankAccount from '@/models/BankAccount'
import Cash from '@/models/Cash'
import Investment from '@/models/Investment'
import Budget from '@/models/Budget'
import Salary from '@/models/Salary'
import RecurringExpense from '@/models/RecurringExpense'
import Goal from '@/models/Goal'
import Insurance from '@/models/Insurance'
import CreditCard from '@/models/CreditCard'
import Tag from '@/models/Tag'
import Rule from '@/models/Rule'
import Loan from '@/models/Loan'
import Subscription from '@/models/Subscription'
import Reminder from '@/models/Reminder'
import SipPlan from '@/models/SipPlan'
import MFTransaction from '@/models/MFTransaction'
import Document from '@/models/Document'
import PasswordEntry from '@/models/PasswordEntry'
import EmergencyFund from '@/models/EmergencyFund'
import AllocationTarget from '@/models/AllocationTarget'
import Family from '@/models/Family'
import FamilyGoal from '@/models/FamilyGoal'
import FamilyBudget from '@/models/FamilyBudget'
import FamilyExpense from '@/models/FamilyExpense'
import LoanPayment from '@/models/LoanPayment'
import Nominee from '@/models/Nominee'
import LegacyPlan from '@/models/LegacyPlan'
import { encrypt } from '@/lib/utils/crypto'
import { buildDemoLoanPayments } from '@/lib/seed/demoLoanPayments'
import { buildDemoDocuments, writeDemoDocumentFiles } from '@/lib/seed/demoDocuments'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d
}

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(12, 0, 0, 0)
  return d
}

function monthRange(offset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59)
  return { start, end }
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)]
}

export function isDemoModeEnabled() {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  )
}

export async function isUserDataEmpty(userId) {
  const count = await Category.countDocuments({ userId })
  return count === 0
}

async function clearUserData(userId) {
  const family = await Family.findOne({
    $or: [{ familyHead: userId }, { 'members.user': userId, 'members.status': 'active' }],
  })

  const deletes = [
    Category.deleteMany({ userId }),
    Transaction.deleteMany({ userId }),
    BankAccount.deleteMany({ userId }),
    Cash.deleteMany({ userId }),
    Investment.deleteMany({ userId }),
    Budget.deleteMany({ userId }),
    Salary.deleteMany({ userId }),
    RecurringExpense.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    Insurance.deleteMany({ userId }),
    CreditCard.deleteMany({ userId }),
    Tag.deleteMany({ userId }),
    Rule.deleteMany({ userId }),
    Loan.deleteMany({ userId }),
    Subscription.deleteMany({ userId }),
    Reminder.deleteMany({ userId }),
    SipPlan.deleteMany({ userId }),
    MFTransaction.deleteMany({ userId }),
    Document.deleteMany({ userId }),
    PasswordEntry.deleteMany({ userId }),
    EmergencyFund.deleteMany({ userId }),
    AllocationTarget.deleteMany({ userId }),
    LoanPayment.deleteMany({ userId }),
    Nominee.deleteMany({ userId }),
    LegacyPlan.deleteMany({ userId }),
  ]

  if (family) {
    deletes.push(
      FamilyGoal.deleteMany({ familyId: family._id }),
      FamilyBudget.deleteMany({ familyId: family._id }),
      FamilyExpense.deleteMany({ familyId: family._id })
    )
    if (family.familyHead.toString() === userId.toString()) {
      deletes.push(Family.findByIdAndDelete(family._id))
    }
  }

  await Promise.all(deletes)
}

function buildTransactions(userId, refs) {
  const { cat, acc } = refs
  const txs = []
  const expensePool = [
    { categoryId: cat.food, accountId: acc.hdfc, amounts: [450, 320, 1800, 650, 920], descriptions: ['Lunch at cafe', 'Coffee & snacks', 'Groceries', 'Dinner out', 'Food delivery'] },
    { categoryId: cat.transport, accountId: acc.hdfc, amounts: [1200, 350, 1500, 80], descriptions: ['Uber rides', 'Metro pass', 'Petrol', 'Auto fare'] },
    { categoryId: cat.shopping, accountId: acc.sbi, amounts: [3200, 5500, 1200, 890], descriptions: ['Amazon order', 'New headphones', 'Clothing', 'Home supplies'] },
    { categoryId: cat.bills, accountId: acc.hdfc, amounts: [2500, 4200, 899, 1500], descriptions: ['Electricity bill', 'Internet + mobile', 'Streaming bundle', 'Gas cylinder'] },
    { categoryId: cat.entertainment, accountId: acc.hdfc, amounts: [899, 2100, 450, 1200], descriptions: ['Netflix + Spotify', 'Movie night', 'Concert tickets', 'Gaming subscription'] },
    { categoryId: cat.healthcare, accountId: acc.sbi, amounts: [800, 2500, 350], descriptions: ['Pharmacy', 'Doctor visit', 'Vitamins'] },
    { categoryId: cat.education, accountId: acc.hdfc, amounts: [5000, 1200, 3500], descriptions: ['Online course', 'Books', 'Workshop fee'] },
    { categoryId: cat.rent, accountId: acc.hdfc, amounts: [18000], descriptions: ['Monthly rent'] },
  ]

  const weekExpenses = [
    { day: 0, categoryId: cat.food, amount: 450, description: 'Lunch at cafe', tagIds: refs.tags.essential ? [refs.tags.essential] : [] },
    { day: 1, categoryId: cat.transport, amount: 1200, description: 'Uber rides' },
    { day: 2, categoryId: cat.shopping, amount: 3200, description: 'Amazon order', tagIds: refs.tags.discretionary ? [refs.tags.discretionary] : [] },
    { day: 3, categoryId: cat.food, amount: 650, description: 'Coffee & snacks' },
    { day: 4, categoryId: cat.bills, amount: 2500, description: 'Electricity bill', tagIds: refs.tags.essential ? [refs.tags.essential] : [] },
    { day: 5, categoryId: cat.entertainment, amount: 899, description: 'Netflix + Spotify' },
    { day: 6, categoryId: cat.food, amount: 1800, description: 'Groceries (cash)', isCash: true, accountId: null },
  ]

  weekExpenses.forEach(({ day, categoryId, amount, description, isCash = false, accountId = acc.hdfc, tagIds = [] }) => {
    txs.push({
      userId,
      type: 'expense',
      amount,
      categoryId,
      accountId,
      isCash,
      description,
      tagIds,
      date: daysAgo(day),
    })
  })

  for (let month = 0; month < 6; month++) {
    const salaryDay = month * 30 + 1
    txs.push({
      userId,
      type: 'income',
      amount: 85000,
      categoryId: cat.salary,
      accountId: acc.hdfc,
      description: 'Monthly salary',
      date: daysAgo(salaryDay),
    })

    if (month % 2 === 0) {
      txs.push({
        userId,
        type: 'income',
        amount: 15000,
        categoryId: cat.freelance,
        accountId: acc.sbi,
        description: 'Freelance project',
        date: daysAgo(salaryDay + 5),
      })
    }

    txs.push({
      userId,
      type: 'expense',
      amount: 18000,
      categoryId: cat.rent,
      accountId: acc.hdfc,
      description: 'Monthly rent',
      date: daysAgo(salaryDay + 2),
    })

    if (month > 0) {
      txs.push({
        userId,
        type: 'transfer',
        amount: 10000,
        accountId: acc.hdfc,
        transferToAccountId: acc.sbi,
        description: 'Savings transfer',
        date: daysAgo(salaryDay + 8),
      })
    }

    const expensesThisMonth = 6 + (month % 3)
    for (let i = 0; i < expensesThisMonth; i++) {
      const template = pick(expensePool.filter((e) => e.categoryId !== cat.rent))
      const dayOffset = salaryDay + 3 + i * 4
      if (dayOffset <= 6) continue
      txs.push({
        userId,
        type: 'expense',
        amount: pick(template.amounts),
        categoryId: template.categoryId,
        accountId: template.accountId,
        description: pick(template.descriptions),
        date: daysAgo(dayOffset),
      })
    }
  }

  return txs
}

export async function seedUserDemoData(userId, userName = 'Demo User', { force = false } = {}) {
  if (!isDemoModeEnabled()) {
    return { skipped: true, reason: 'demo_mode_disabled' }
  }

  if (!force && !(await isUserDataEmpty(userId))) {
    return { skipped: true, reason: 'data_exists' }
  }

  if (force) {
    await clearUserData(userId)
  }

  const { start: monthStart, end: monthEnd } = monthRange()
  const { start: quarterStart, end: quarterEnd } = monthRange(-2)

  const categories = await Category.insertMany([
    { userId, name: 'Salary', type: 'income', icon: '💼', color: '#22c55e', budget: 0 },
    { userId, name: 'Freelance', type: 'income', icon: '💻', color: '#10b981', budget: 0 },
    { userId, name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#f97316', budget: 8000 },
    { userId, name: 'Transport', type: 'expense', icon: '🚗', color: '#3b82f6', budget: 3000 },
    { userId, name: 'Shopping', type: 'expense', icon: '🛍️', color: '#a855f7', budget: 5000 },
    { userId, name: 'Bills & Utilities', type: 'expense', icon: '💡', color: '#eab308', budget: 4000 },
    { userId, name: 'Entertainment', type: 'expense', icon: '🎬', color: '#ec4899', budget: 2000 },
    { userId, name: 'Healthcare', type: 'expense', icon: '🏥', color: '#ef4444', budget: 3000 },
    { userId, name: 'Education', type: 'expense', icon: '📚', color: '#6366f1', budget: 5000 },
    { userId, name: 'Rent', type: 'expense', icon: '🏠', color: '#78716c', budget: 18000 },
  ])

  const cat = {
    salary: categories[0]._id,
    freelance: categories[1]._id,
    food: categories[2]._id,
    transport: categories[3]._id,
    shopping: categories[4]._id,
    bills: categories[5]._id,
    entertainment: categories[6]._id,
    healthcare: categories[7]._id,
    education: categories[8]._id,
    rent: categories[9]._id,
  }

  const bankAccounts = await BankAccount.insertMany([
    { userId, accountName: 'HDFC Savings', bankName: 'HDFC Bank', accountNumber: '****4521', accountType: 'Savings', balance: 125000, color: '#2563eb', icon: '🏦' },
    { userId, accountName: 'SBI Current', bankName: 'State Bank of India', accountNumber: '****8834', accountType: 'Current', balance: 45000, color: '#0ea5e9', icon: '🏛️' },
    { userId, accountName: 'ICICI Credit', bankName: 'ICICI Bank', accountNumber: '****2290', accountType: 'Credit Card', balance: -12500, color: '#f97316', icon: '💳' },
  ])

  const acc = { hdfc: bankAccounts[0]._id, sbi: bankAccounts[1]._id, icici: bankAccounts[2]._id }

  await Cash.create({ userId, amount: 5000, currency: 'INR' })

  const tags = await Tag.insertMany([
    { userId, name: 'Essential', color: '#22c55e' },
    { userId, name: 'Discretionary', color: '#f97316' },
    { userId, name: 'Tax Deductible', color: '#6366f1' },
    { userId, name: 'Work', color: '#3b82f6' },
    { userId, name: 'Family', color: '#ec4899' },
  ])

  const tagRefs = {
    essential: tags[0]._id,
    discretionary: tags[1]._id,
    tax: tags[2]._id,
    work: tags[3]._id,
    family: tags[4]._id,
  }

  const transactions = await Transaction.insertMany(
    buildTransactions(userId, { cat, acc, tags: tagRefs })
  )

  const budgets = await Budget.insertMany([
    { userId, categoryId: cat.food, name: 'Food budget', amount: 8000, period: 'monthly', startDate: monthStart, endDate: monthEnd, isActive: true, description: 'Monthly food limit' },
    { userId, categoryId: cat.transport, name: 'Transport budget', amount: 3000, period: 'monthly', startDate: monthStart, endDate: monthEnd, isActive: true },
    { userId, categoryId: cat.shopping, name: 'Shopping budget', amount: 5000, period: 'monthly', startDate: monthStart, endDate: monthEnd, isActive: true },
    { userId, categoryId: cat.healthcare, name: 'Healthcare budget', amount: 3000, period: 'quarterly', startDate: quarterStart, endDate: quarterEnd, isActive: true },
    { userId, categoryId: cat.education, name: 'Learning budget', amount: 15000, period: 'yearly', startDate: monthRange(-11).start, endDate: monthEnd, isActive: true, description: 'Courses and books' },
  ])

  const goals = await Goal.insertMany([
    { userId, title: 'Europe Vacation', description: 'Summer trip fund', targetAmount: 200000, currentAmount: 75000, targetDate: daysFromNow(120), category: 'vacation', monthlyContribution: 8000, expectedReturn: 8, status: 'active' },
    { userId, title: 'New Car', targetAmount: 800000, currentAmount: 150000, targetDate: daysFromNow(300), category: 'car', monthlyContribution: 15000, expectedReturn: 7, status: 'active' },
    { userId, title: 'Emergency Fund', description: '6 months expenses', targetAmount: 300000, currentAmount: 180000, targetDate: daysFromNow(60), category: 'emergency', monthlyContribution: 10000, expectedReturn: 6, status: 'active' },
    { userId, title: 'Home Down Payment', targetAmount: 1500000, currentAmount: 320000, targetDate: daysFromNow(540), category: 'house', monthlyContribution: 25000, expectedReturn: 9, status: 'active' },
  ])

  const investments = await Investment.insertMany([
    { userId, type: 'Mutual Fund', name: 'Nifty 50 Index Fund', amount: 50000, investedDate: daysAgo(180), maturityType: 'Ongoing', currentValue: 58000, interestRate: 12.5, accountId: acc.hdfc, assetClass: 'equity', schemeCode: '120503', amc: 'UTI', units: 450, purchaseNav: 111.11, currentNav: 128.89, navDate: daysAgo(1), sipAmount: 5000, goalId: goals[0]._id, notes: 'SIP ongoing' },
    { userId, type: 'FD', name: 'HDFC Fixed Deposit', amount: 100000, investedDate: daysAgo(90), maturityDate: daysFromNow(275), maturityType: 'Maturity', currentValue: 106000, interestRate: 7.1, accountId: acc.hdfc, assetClass: 'debt' },
    { userId, type: 'Gold ETF', name: 'SBI Gold ETF', amount: 25000, investedDate: daysAgo(60), maturityType: 'Ongoing', currentValue: 27200, accountId: acc.sbi, assetClass: 'gold' },
    { userId, type: 'Stock', name: 'Reliance Industries', amount: 35000, investedDate: daysAgo(120), maturityType: 'Ongoing', currentValue: 41200, interestRate: 17.7, accountId: acc.sbi, assetClass: 'equity', notes: 'Long-term hold' },
    { userId, type: 'EPF', name: 'Employee Provident Fund', amount: 180000, investedDate: daysAgo(730), maturityType: 'Ongoing', currentValue: 215000, interestRate: 8.25, accountId: acc.hdfc, assetClass: 'debt', notes: 'Employer matched' },
  ])

  const creditCards = await CreditCard.insertMany([
    { userId, cardName: 'HDFC Regalia', issuer: 'HDFC Bank', cardType: 'Visa', lastFourDigits: '4521', creditLimit: 300000, currentBalance: 18500, statementDay: 5, dueDay: 25, apr: 42, rewardsProgram: 'Regalia Points', accountId: acc.hdfc, color: '#7c3aed' },
    { userId, cardName: 'SBI SimplyCLICK', issuer: 'SBI Card', cardType: 'Visa', lastFourDigits: '8834', creditLimit: 150000, currentBalance: 8200, statementDay: 15, dueDay: 5, apr: 45, accountId: acc.sbi, color: '#2563eb' },
    { userId, cardName: 'ICICI Amazon Pay', issuer: 'ICICI Bank', cardType: 'Visa', lastFourDigits: '2290', creditLimit: 200000, currentBalance: 12500, statementDay: 10, dueDay: 28, apr: 43, rewardsProgram: 'Amazon Pay cashback', accountId: acc.icici, color: '#f97316' },
  ])

  const insurance = await Insurance.insertMany([
    { userId, type: 'Health', name: 'Family Health Cover', policyNumber: 'HLTH-2024-001', premium: 24000, premiumFrequency: 'Yearly', startDate: daysAgo(200), renewalDate: daysFromNow(165), coverageAmount: 1000000, accountId: acc.hdfc, isActive: true },
    { userId, type: 'Term Insurance', name: 'Life Term Plan', policyNumber: 'LIFE-2023-042', premium: 18000, premiumFrequency: 'Yearly', startDate: daysAgo(400), renewalDate: daysFromNow(330), coverageAmount: 5000000, accountId: acc.hdfc, isActive: true },
    { userId, type: 'Motor', name: 'Car Insurance', policyNumber: 'MOTOR-2025-118', premium: 8500, premiumFrequency: 'Yearly', startDate: daysAgo(100), renewalDate: daysFromNow(265), coverageAmount: 800000, accountId: acc.sbi, isActive: true },
    { userId, type: 'Home', name: 'Home Insurance', policyNumber: 'HOME-2024-055', premium: 6000, premiumFrequency: 'Yearly', startDate: daysAgo(150), renewalDate: daysFromNow(215), coverageAmount: 2500000, accountId: acc.hdfc, isActive: true, notes: 'Covers structure and contents' },
  ])

  const salary = await Salary.insertMany([
    { userId, amount: 85000, currency: 'INR', frequency: 'monthly', startDate: daysAgo(365), isActive: true, description: 'Primary job salary', accountId: acc.hdfc, categoryId: cat.salary },
    { userId, amount: 15000, currency: 'INR', frequency: 'monthly', startDate: daysAgo(180), isActive: true, description: 'Freelance retainer', accountId: acc.sbi, categoryId: cat.freelance },
  ])

  const recurringExpenses = await RecurringExpense.insertMany([
    { userId, name: 'Netflix', amount: 649, frequency: 'monthly', dayOfMonth: 5, startDate: daysAgo(180), nextDueDate: daysFromNow(5), categoryId: cat.entertainment, accountId: acc.hdfc, isActive: true, autoCreateTransaction: true },
    { userId, name: 'Gym membership', amount: 1500, frequency: 'monthly', dayOfMonth: 1, startDate: daysAgo(90), nextDueDate: daysFromNow(8), categoryId: cat.entertainment, accountId: acc.hdfc, isActive: true },
    { userId, name: 'Rent', amount: 18000, frequency: 'monthly', dayOfMonth: 1, startDate: daysAgo(365), nextDueDate: daysFromNow(8), categoryId: cat.rent, accountId: acc.hdfc, isActive: true, autoCreateTransaction: true },
    { userId, name: 'Spotify', amount: 119, frequency: 'monthly', dayOfMonth: 12, startDate: daysAgo(200), nextDueDate: daysFromNow(3), categoryId: cat.entertainment, accountId: acc.hdfc, isActive: true, autoCreateTransaction: true },
    { userId, name: 'Health insurance premium', amount: 2000, frequency: 'monthly', dayOfMonth: 15, startDate: daysAgo(300), nextDueDate: daysFromNow(7), categoryId: cat.healthcare, accountId: acc.sbi, isActive: true },
  ])

  const loans = await Loan.insertMany([
    {
      userId,
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
      accountId: acc.hdfc,
      ownership: 'joint',
      coBorrowers: [{ name: 'Priya Bhoir', sharePercent: 50 }],
      notes: '20-year tenure',
    },
    {
      userId,
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
      accountId: acc.sbi,
    },
  ])

  const loanPayments = await LoanPayment.insertMany(
    buildDemoLoanPayments({
      homeLoanId: loans[0]._id,
      carLoanId: loans[1]._id,
      homeAccountId: acc.hdfc,
      carAccountId: acc.sbi,
      daysAgo,
    }).map((payment) => ({ userId, ...payment }))
  )

  const subscriptions = await Subscription.insertMany([
    { userId, name: 'Netflix', amount: 649, frequency: 'monthly', nextBillingDate: daysFromNow(5), categoryId: cat.entertainment, accountId: acc.hdfc, status: 'active' },
    { userId, name: 'Spotify Premium', amount: 119, frequency: 'monthly', nextBillingDate: daysFromNow(12), categoryId: cat.entertainment, accountId: acc.hdfc, status: 'active' },
    { userId, name: 'Amazon Prime', amount: 1499, frequency: 'yearly', nextBillingDate: daysFromNow(90), categoryId: cat.shopping, accountId: acc.icici, status: 'active' },
    { userId, name: 'iCloud Storage', amount: 75, frequency: 'monthly', nextBillingDate: daysFromNow(20), categoryId: cat.bills, accountId: acc.hdfc, status: 'active', notes: '200GB plan' },
  ])

  const reminders = await Reminder.insertMany([
    { userId, title: 'HDFC Regalia payment', type: 'credit_card', dueDate: daysFromNow(5), amount: 18500, status: 'upcoming', linkedId: creditCards[0]._id, linkedType: 'CreditCard' },
    { userId, title: 'Home loan EMI', type: 'emi', dueDate: daysFromNow(3), amount: 38500, status: 'upcoming', linkedId: loans[0]._id, linkedType: 'Loan' },
    { userId, title: 'Health insurance renewal', type: 'insurance', dueDate: daysFromNow(30), amount: 24000, status: 'upcoming', linkedId: insurance[0]._id, linkedType: 'Insurance' },
    { userId, title: 'Nifty 50 SIP', type: 'sip', dueDate: daysFromNow(7), amount: 5000, status: 'upcoming', linkedId: investments[0]._id, linkedType: 'Investment' },
    { userId, title: 'Electricity bill', type: 'bill', dueDate: daysFromNow(2), amount: 2500, status: 'today' },
  ])

  const sipPlans = await SipPlan.insertMany([
    { userId, name: 'Nifty 50 SIP', investmentId: investments[0]._id, schemeCode: '120503', amount: 5000, frequency: 'monthly', nextDate: daysFromNow(7), accountId: acc.hdfc, goalId: goals[0]._id, status: 'active' },
    { userId, name: 'Gold ETF SIP', investmentId: investments[2]._id, amount: 2000, frequency: 'monthly', nextDate: daysFromNow(10), accountId: acc.sbi, status: 'active' },
  ])

  const mfTransactions = await MFTransaction.insertMany([
    { userId, investmentId: investments[0]._id, type: 'sip', date: daysAgo(30), units: 40, nav: 125.5, amount: 5020, notes: 'Monthly SIP' },
    { userId, investmentId: investments[0]._id, type: 'sip', date: daysAgo(60), units: 42, nav: 119.0, amount: 4998 },
    { userId, investmentId: investments[0]._id, type: 'buy', date: daysAgo(180), units: 368, nav: 111.11, amount: 40888, notes: 'Initial lump sum' },
    { userId, investmentId: investments[2]._id, type: 'sip', date: daysAgo(15), units: 3.2, nav: 62.5, amount: 200 },
  ])

  const rules = await Rule.insertMany([
    { userId, name: 'Auto-categorize Uber', enabled: true, priority: 10, conditions: { field: 'description', operator: 'contains', value: 'Uber' }, actions: { categoryId: cat.transport, type: 'expense', tagIds: [tagRefs.work] } },
    { userId, name: 'Tag groceries', enabled: true, priority: 5, conditions: { field: 'description', operator: 'contains', value: 'Groceries' }, actions: { categoryId: cat.food, type: 'expense', tagIds: [tagRefs.essential] } },
    { userId, name: 'Large expenses alert', enabled: true, priority: 1, conditions: { field: 'amount', operator: 'greaterThan', value: '10000' }, actions: { categoryId: cat.shopping, type: 'expense' } },
  ])

  const demoFiles = await writeDemoDocumentFiles(userId)
  const documents = await Document.insertMany(
    buildDemoDocuments(userId, tagRefs, demoFiles)
  )

  const passwords = await PasswordEntry.insertMany([
    { userId, service: 'HDFC NetBanking', username: 'demo@email.com', encryptedPassword: encrypt('DemoPass@123'), url: 'https://netbanking.hdfcbank.com', category: 'banking', tagIds: [tagRefs.work] },
    { userId, service: 'Groww', username: 'demo@email.com', encryptedPassword: encrypt('GrowwDemo!456'), url: 'https://groww.in', category: 'investment' },
    { userId, service: 'Amazon India', username: 'demo@email.com', encryptedPassword: encrypt('AmazonDemo789'), url: 'https://amazon.in', category: 'shopping', tagIds: [tagRefs.discretionary] },
  ])

  await EmergencyFund.create({
    userId,
    currentAmount: 180000,
    targetAmount: 300000,
    monthlyContribution: 10000,
    monthlyExpenses: 50000,
    accountId: acc.hdfc,
  })

  await AllocationTarget.create({
    userId,
    equity: 60,
    debt: 25,
    gold: 10,
    cash: 5,
    other: 0,
  })

  await Nominee.create({
    userId,
    name: 'Priya Bhoir',
    email: 'nominee@example.com',
    phone: '+91 98765 43210',
    relationship: 'spouse',
    notes: 'Primary beneficiary — receives vault access when legacy is released',
  })

  await LegacyPlan.create({
    userId,
    enabled: true,
    releaseMode: 'inactivity',
    inactivityDays: 90,
    lastActiveAt: new Date(),
    released: false,
    accessScopes: {
      netWorth: true,
      accounts: true,
      investments: true,
      loans: true,
      insurance: true,
      passwords: true,
      documents: true,
    },
  })

  let family = await Family.findOne({
    $or: [{ familyHead: userId }, { 'members.user': userId, 'members.status': 'active' }],
  })

  if (!family) {
    family = await Family.create({
      name: `${userName.split(' ')[0] || 'Demo'}'s Family`,
      familyHead: userId,
      members: [{ user: userId, role: 'head', status: 'active' }],
      settings: { shareInvestments: true, shareExpenses: true, shareBudgets: true, shareSalary: true },
    })
  }

  const familyGoals = await FamilyGoal.insertMany([
    { familyId: family._id, title: 'Europe Vacation', description: 'Summer trip fund', targetAmount: 200000, currentAmount: 75000, targetDate: daysFromNow(120), category: 'savings', status: 'active', createdBy: userId, memberSplits: [{ user: userId, percentage: 100, targetAmount: 200000, currentAmount: 75000 }] },
    { familyId: family._id, title: 'Home Renovation', targetAmount: 500000, currentAmount: 120000, targetDate: daysFromNow(300), category: 'expense', status: 'active', createdBy: userId, memberSplits: [{ user: userId, percentage: 100, targetAmount: 500000, currentAmount: 120000 }] },
    { familyId: family._id, title: 'Kids Education Fund', description: 'College savings', targetAmount: 1000000, currentAmount: 250000, targetDate: daysFromNow(720), category: 'savings', status: 'active', createdBy: userId, memberSplits: [{ user: userId, percentage: 100, targetAmount: 1000000, currentAmount: 250000 }] },
  ])

  const familyBudgets = await FamilyBudget.insertMany([
    { familyId: family._id, categoryName: 'Groceries', amount: 12000, period: 'monthly', startDate: monthStart, endDate: monthEnd, createdBy: userId },
    { familyId: family._id, categoryName: 'Kids Education', amount: 25000, period: 'monthly', startDate: monthStart, endDate: monthEnd, createdBy: userId },
    { familyId: family._id, categoryName: 'Utilities', amount: 8000, period: 'monthly', startDate: monthStart, endDate: monthEnd, createdBy: userId },
  ])

  const familyExpenses = await FamilyExpense.insertMany([
    { familyId: family._id, title: 'Weekly groceries', amount: 3500, category: 'Groceries', date: daysAgo(2), paidBy: userId, createdBy: userId },
    { familyId: family._id, title: 'School fees', amount: 12000, category: 'Education', date: daysAgo(10), paidBy: userId, createdBy: userId },
    { familyId: family._id, title: 'Family dinner', amount: 2800, category: 'Food', date: daysAgo(5), paidBy: userId, createdBy: userId },
    { familyId: family._id, title: 'Electricity bill', amount: 4200, category: 'Utilities', date: daysAgo(15), paidBy: userId, createdBy: userId },
    { familyId: family._id, title: 'Kids sports class', amount: 2500, category: 'Education', date: daysAgo(8), paidBy: userId, createdBy: userId },
  ])

  return {
    seeded: true,
    counts: {
      categories: categories.length,
      bankAccounts: bankAccounts.length,
      transactions: transactions.length,
      budgets: budgets.length,
      investments: investments.length,
      goals: goals.length,
      creditCards: creditCards.length,
      insurance: insurance.length,
      salary: salary.length,
      recurringExpenses: recurringExpenses.length,
      loans: loans.length,
      loanPayments: loanPayments.length,
      subscriptions: subscriptions.length,
      reminders: reminders.length,
      sipPlans: sipPlans.length,
      mfTransactions: mfTransactions.length,
      tags: tags.length,
      rules: rules.length,
      documents: documents.length,
      passwords: passwords.length,
      nominee: 1,
      legacyPlan: 1,
      familyGoals: familyGoals.length,
      familyBudgets: familyBudgets.length,
      familyExpenses: familyExpenses.length,
    },
  }
}
