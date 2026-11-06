// Single source of truth for the optional modules a user can switch on or off.
// Stable keys are stored per user (server for real accounts, browser for demo). Turning a feature off only hides it:
// its records are never deleted.

export const FEATURES = [
  { key: 'dashboard', name: 'Dashboard & Net Worth', icon: 'LayoutDashboard', core: true, path: '/dashboard', navPaths: ['/dashboard', '/dashboard/net-worth'], description: 'Get a complete overview of your financial position.', benefits: ['Total assets and liabilities', 'Net worth history and comparisons', 'Asset allocation', 'Goals such as an emergency fund'], needs: 'Nothing to start. Add accounts and investments to fill it.', goals: ['networth'] },
  { key: 'bank_accounts', name: 'Bank Accounts', icon: 'Landmark', path: '/dashboard/bank-accounts', description: 'Keep track of all your savings accounts and cash in one place.', benefits: ['Multiple savings accounts', 'Manual balance updates', 'Balance history', 'Minimum balance (MAB) awareness'], needs: 'Bank name, account number and current balance for each savings account.', goals: ['banks'] },
  { key: 'mutual_funds', name: 'Mutual Funds & SIPs', icon: 'PieChart', path: '/dashboard/mutual-funds', description: 'Monitor your investment portfolio and SIP commitments.', benefits: ['Invested vs current value', 'Absolute return and XIRR', 'SIP tracking and reminders', 'Weekly NAV updates'], needs: 'Fund name, folio, units and NAV (or a Zerodha connection).', goals: ['funds'] },
  { key: 'credit_cards', name: 'Cards', icon: 'CreditCard', path: '/dashboard/credit-cards', description: 'Manage your credit and debit cards, spending and payment due dates.', benefits: ['Limits, outstanding and utilisation', 'Statement and due dates', 'Payment history', 'Debit cards linked to accounts'], needs: 'Card details, limit and current outstanding.', goals: ['cards'] },
  { key: 'insurance', name: 'Insurance', icon: 'Shield', path: '/dashboard/insurance', description: 'Keep all your insurance policies organised.', benefits: ['Health, life, term, motor and home', 'Premium and expiry reminders', 'Nominee details', 'Family mapping'], needs: 'Policy number, sum assured, premium and dates.', goals: ['insurance'] },
  { key: 'budget_expenses', name: 'Budget & Expenses', icon: 'Wallet', path: '/dashboard/budget', description: 'Understand where your money goes and stay within your budget.', benefits: ['Monthly and category budgets', 'Expected vs actual daily pace', 'Calendar and stats views', 'Month-end forecast'], needs: 'A monthly budget amount. Expenses can be added as you go.', goals: ['budget'] },
  { key: 'planning_tools', name: 'Planning Tools', icon: 'Calculator', path: '/dashboard/tools', description: 'Planners that use your own numbers: emergency fund, loan payoff, insurance cover and retirement.', benefits: ['Prefilled from your accounts and loans', 'Emergency fund runway', 'Pay loans off faster', 'Life cover and retirement check'], needs: 'Nothing extra. Add accounts, loans and a budget to get prefilled answers.', goals: [] },
  { key: 'family_circle', name: 'Family Circle', icon: 'Users', path: '/dashboard/family', description: "Manage and understand your family's combined financial position.", benefits: ['Invite family members', 'Consolidated family net worth', 'You choose what each person sees', 'Joint assets counted once'], needs: 'Email addresses of the people you invite. Everyone controls their own sharing.', goals: ['family'] },
  { key: 'vault', name: 'My Vault', icon: 'KeyRound', sensitive: true, path: '/dashboard/vault', description: 'Securely store your important passwords and credentials.', benefits: ['Zero-knowledge encryption on your device', 'Password generator and strength meter', 'Secure notes and favourites', 'Auto-lock'], needs: 'A master password you create. We cannot recover it for you; you also get a recovery key.', goals: ['vault'] },
  { key: 'documents', name: 'Documents', icon: 'FileText', noRoute: true, path: '/dashboard/vault?tab=documents', description: 'Keep your important financial documents organised in your own Google Drive.', benefits: ['Identity, bank, investment and insurance papers', 'Organised folders', 'Preview and download', 'Minimal Drive access'], needs: 'Connecting your Google Drive (only files this app creates).', goals: ['documents'] },
  { key: 'digital_legacy', name: 'Digital Legacy', icon: 'HeartHandshake', sensitive: true, noRoute: true, path: '/dashboard/vault?tab=legacy', description: 'Help trusted family understand your financial arrangements in an emergency.', benefits: ['Emergency contacts', 'Inactivity checks with grace periods', 'Legacy information package', 'Verified, logged access'], needs: 'Contacts you trust. Inactivity is never treated as proof of death.', goals: ['legacy'] },
  { key: 'ai_assistant', name: 'AI Wealth Assistant', icon: 'Sparkles', path: '/dashboard/ai', description: 'Get insights and answers about your finances.', benefits: ['Ask in plain language', 'Spending and budget insights', 'Financial health score', 'Monthly summary report'], needs: 'Nothing extra. An optional AI provider is used only with your consent.', goals: ['ai'] },
  { key: 'automation', name: 'Smart Automation', icon: 'Zap', noRoute: true, path: '/dashboard/settings?tab=automation', description: 'Automate financial reminders and routine updates.', benefits: ['Card, premium and SIP reminders', 'Budget alerts', 'Monthly reports', 'History of every run'], needs: 'Choose which reminders you want. Automations only notify; they never move money.', goals: ['automation'] },
]

export const FEATURE_KEYS = FEATURES.map((f) => f.key)
export const featureByKey = (k) => FEATURES.find((f) => f.key === k)

export const PACKAGES = [
  { key: 'basic', name: 'Basic', description: 'Just the essentials.', features: ['dashboard', 'bank_accounts'] },
  { key: 'investor', name: 'Investor', description: 'Track your portfolio too.', features: ['dashboard', 'bank_accounts', 'mutual_funds'] },
  { key: 'family', name: 'Family Wealth', description: 'Protect and share with family.', features: ['dashboard', 'bank_accounts', 'mutual_funds', 'insurance', 'family_circle', 'documents'] },
  { key: 'complete', name: 'Complete Wealth Management', description: 'Everything available.', features: FEATURE_KEYS },
]

export const GOALS = [
  { key: 'networth', label: 'Track my total net worth', icon: 'TrendingUp' },
  { key: 'banks', label: 'Manage my bank accounts', icon: 'Landmark' },
  { key: 'funds', label: 'Track mutual funds and SIPs', icon: 'PieChart' },
  { key: 'cards', label: 'Manage credit cards and payments', icon: 'CreditCard' },
  { key: 'insurance', label: 'Track insurance policies', icon: 'Shield' },
  { key: 'budget', label: 'Manage monthly budgets and expenses', icon: 'Wallet' },
  { key: 'family', label: "Manage my family's wealth", icon: 'Users' },
  { key: 'documents', label: 'Store important financial documents', icon: 'FileText' },
  { key: 'vault', label: 'Securely manage passwords', icon: 'KeyRound' },
  { key: 'legacy', label: 'Prepare for emergencies and digital legacy', icon: 'HeartHandshake' },
  { key: 'ai', label: 'Get AI-powered financial insights', icon: 'Sparkles' },
  { key: 'automation', label: 'Automate financial reminders', icon: 'Zap' },
]

/** Features suggested by the goals the user ticked. Only a hint (a "Recommended" badge): nothing is enabled from it. */
export function recommendedFor(goalKeys) {
  const set = new Set(goalKeys || [])
  return FEATURES.filter((f) => f.goals.some((g) => set.has(g))).map((f) => f.key)
}

/** Dashboard is always on; unknown keys are dropped; order follows the registry. */
export function normaliseSelection(keys) {
  const set = new Set([...(keys || []), 'dashboard'])
  return FEATURE_KEYS.filter((k) => set.has(k))
}

export const COMING_SOON = [
  { key: 'tax_planning', name: 'Tax Planning', description: 'Capital gains and tax-saving tracking.' },
]

export const isFeatureEnabled = (enabled, key) => key === 'dashboard' || (enabled instanceof Set ? enabled.has(key) : (enabled || []).includes(key))

/** Which feature a path belongs to (null = not feature gated, e.g. Settings). */
export function featureForPath(pathname) {
  const clean = pathname.split('?')[0]
  for (const f of FEATURES) {
    if (f.key === 'dashboard' || f.noRoute) continue
    const base = f.path.split('?')[0]
    if (base !== '/dashboard' && (clean === base || clean.startsWith(base + '/'))) return f.key
  }
  if (clean === '/dashboard/net-worth' || clean === '/dashboard') return 'dashboard'
  return null
}

/** Age is optional; when given it must be a whole number from 18 to 120. */
export function validateAge(v) {
  if (v === '' || v == null) return { ok: true, value: null }
  const n = Number(v)
  if (!Number.isInteger(n) || n < 18 || n > 120) return { ok: false, error: 'Enter an age between 18 and 120, or skip this' }
  return { ok: true, value: n }
}

/** Mobile number is optional. Accepts an optional leading +, digits, spaces, dashes and brackets; 7 to 15 digits (international limit).
 *  Returns the tidied number to store. */
export function validateMobile(v) {
  const raw = String(v ?? '').trim()
  if (!raw) return { ok: true, value: '' }
  if (!/^\+?[0-9\s()-]+$/.test(raw)) return { ok: false, error: 'Use digits only, with an optional + at the start' }
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return { ok: false, error: 'Enter a number with 7 to 15 digits' }
  if (/^(\d)\1+$/.test(digits)) return { ok: false, error: 'Enter a real mobile number' }
  return { ok: true, value: (raw.startsWith('+') ? '+' : '') + digits }
}

/** Smart suggestions (optional, explained, never auto-enabled). `stats` = counts of what the user already tracks. */
export function suggestFeatures(enabled, stats) {
  const on = (k) => isFeatureEnabled(enabled, k)
  const out = []
  if (on('bank_accounts') && !on('budget_expenses') && stats.banks > 0) out.push({ key: 'budget_expenses', reason: 'You track bank accounts but have no budget. A budget shows where the money goes each month.' })
  if (on('bank_accounts') && !on('mutual_funds') && stats.banks > 0 && stats.funds > 0) out.push({ key: 'mutual_funds', reason: 'You have mutual funds recorded. Turn this on to see them, SIPs and returns.' })
  if (on('insurance') && !on('documents') && stats.policies > 0) out.push({ key: 'documents', reason: 'You track insurance policies. Documents keeps the policy papers with them.' })
  if (on('family_circle') && !on('digital_legacy')) out.push({ key: 'digital_legacy', reason: 'You manage family finances. Digital Legacy lets trusted people know where things are in an emergency.' })
  if (on('credit_cards') && !on('automation') && stats.cards > 0) out.push({ key: 'automation', reason: 'You track cards. Automation can remind you before each due date.' })
  if (!on('ai_assistant') && (stats.banks > 0 || stats.funds > 0)) out.push({ key: 'ai_assistant', reason: 'Ask questions about your net worth, spending and investments in plain language.' })
  return out.filter((s) => !on(s.key))
}
