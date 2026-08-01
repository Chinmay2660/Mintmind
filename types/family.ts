export interface FamilyUser {
  _id: string
  name?: string
  email?: string
  image?: string
}

export interface FamilyMember {
  user: FamilyUser
  role: 'head' | 'member'
  status: 'active' | 'pending' | 'removed'
  joinedAt?: string
}

export interface FamilySettings {
  shareInvestments: boolean
  shareExpenses: boolean
  shareBudgets: boolean
  shareSalary: boolean
}

export interface Family {
  _id: string
  name: string
  familyHead: FamilyUser | string
  members: FamilyMember[]
  settings?: FamilySettings
  createdAt?: string
  updatedAt?: string
}

export interface FamilyStats {
  totalInvestments: number
  totalExpenses: number
  totalIncome: number
  totalBudgets: number
  totalSalary: number
  totalBalance: number
  memberCount: number
}

export interface FamilyGoal {
  _id: string
  title: string
  description?: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  category: 'savings' | 'investment' | 'expense' | 'other'
  status?: 'active' | 'completed' | 'cancelled'
  createdBy?: FamilyUser
}

export interface FamilyBudget {
  _id: string
  categoryName: string
  amount: number
  period: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
  startDate: string
  endDate: string
  description?: string
  createdBy?: FamilyUser
}

export interface FamilyExpense {
  _id: string
  title: string
  description?: string
  amount: number
  category: string
  date: string
  paidBy?: FamilyUser | string
  createdBy?: FamilyUser
}
