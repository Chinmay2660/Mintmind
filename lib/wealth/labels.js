export const ASSET_LABELS = {
  bank: 'Bank & cash',
  mutualFunds: 'Mutual funds',
  stocks: 'Stocks',
  epf: 'EPF',
  ppf: 'PPF',
  nps: 'NPS',
  fd: 'Fixed deposits',
  realEstate: 'Real estate',
  gold: 'Gold',
  other: 'Other assets',
}

/** Categories the user can add manually under Net Worth (bank & MF come from their own modules). */
export const MANUAL_ASSET_CATEGORIES = ['stocks', 'epf', 'ppf', 'nps', 'fd', 'realEstate', 'gold', 'other']

export const LIABILITY_LABELS = {
  creditCards: 'Credit card dues',
  homeLoan: 'Home loan',
  carLoan: 'Car loan',
  personalLoan: 'Personal loan',
  educationLoan: 'Education loan',
  otherLoan: 'Other loan',
}
export const MANUAL_LIABILITY_CATEGORIES = ['homeLoan', 'carLoan', 'personalLoan', 'educationLoan', 'otherLoan']

export const EXPENSE_CATEGORIES = ['Food', 'Shopping', 'Travel', 'Entertainment', 'Groceries', 'Bills', 'Healthcare', 'Other']
export const INCOME_CATEGORIES = ['Salary', 'Business', 'Interest', 'Dividends', 'Rent', 'Gift', 'Refund', 'Other']
export const PAYMENT_MODES = [
  { value: 'upi', label: 'UPI (bank account)' },
  { value: 'cash', label: 'Cash' },
  { value: 'debit', label: 'Debit card' },
  { value: 'card', label: 'Credit card' },
  { value: 'bank', label: 'Net banking / transfer' },
]

export const POLICY_TYPES = [
  { value: 'health', label: 'Health' },
  { value: 'life', label: 'Life' },
  { value: 'term', label: 'Term' },
  { value: 'motor', label: 'Motor' },
  { value: 'home', label: 'Home' },
  { value: 'other', label: 'Other' },
]
export const PREMIUM_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'single', label: 'Single premium' },
]

export const label = (map, key) => map[key] || key
