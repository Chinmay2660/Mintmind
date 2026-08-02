export const ENTITIES = {
  categories: {
    path: '/categories',
    table: 'categories',
    syncOrder: 1,
  },
  bankAccounts: {
    path: '/bank-accounts',
    table: 'bankAccounts',
    syncOrder: 1,
  },
  cash: {
    path: '/cash',
    table: 'cash',
    syncOrder: 1,
    singleton: true,
    singletonId: 'cash',
  },
  investments: {
    path: '/investments',
    table: 'investments',
    syncOrder: 2,
  },
  transactions: {
    path: '/transactions',
    table: 'transactions',
    syncOrder: 2,
  },
  budgets: {
    path: '/budgets',
    table: 'budgets',
    syncOrder: 2,
  },
  salary: {
    path: '/salary',
    table: 'salary',
    syncOrder: 2,
  },
  recurringExpenses: {
    path: '/recurring-expenses',
    table: 'recurringExpenses',
    syncOrder: 2,
  },
  familyGoals: {
    path: '/family/goals',
    table: 'familyGoals',
    syncOrder: 3,
  },
  familyBudgets: {
    path: '/family/budgets',
    table: 'familyBudgets',
    syncOrder: 3,
  },
  familyExpenses: {
    path: '/family/expenses',
    table: 'familyExpenses',
    syncOrder: 3,
  },
  family: {
    path: '/family',
    table: 'family',
    syncOrder: 3,
    singleton: true,
    singletonId: 'family',
    wrapKey: 'family',
  },
  userProfile: {
    path: '/user/profile',
    table: null,
    syncOrder: 1,
    updateOnly: true,
    pull: false,
  },
}

export const COMPUTED_ROUTES = {
  '/dashboard/stats': 'dashboardStats',
  '/dashboard/transaction-stats': 'transactionStats',
  '/dashboard/expense-stats': 'expenseStats',
  '/dashboard/budget-stats': 'budgetStats',
  '/family/stats': 'familyStats',
}

const ONLINE_ONLY_PATTERNS = [
  /^\/family\/pair-code(?:\/|$)/,
  /^\/family\/members(?:\/|$)/,
  /^\/family\/transfer-headship$/,
  /^\/recurring-expenses\/process-due$/,
  /^\/auth(?:\/|$)/,
]

const ENTITY_ENTRIES = Object.entries(ENTITIES).sort(
  ([, a], [, b]) => b.path.length - a.path.length
)

export class OfflineUnavailableError extends Error {
  constructor(message = 'This action requires an internet connection') {
    super(message)
    this.name = 'OfflineUnavailableError'
  }
}

export function isOnlineOnlyRoute(path) {
  return ONLINE_ONLY_PATTERNS.some((pattern) => pattern.test(path))
}

export function parseOfflineRoute(url, method = 'GET') {
  const path = url.split('?')[0].replace(/\/$/, '') || '/'
  const query = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams()

  if (isOnlineOnlyRoute(path)) {
    return { onlineOnly: true, path, method, query }
  }

  if (method.toUpperCase() === 'GET' && COMPUTED_ROUTES[path]) {
    return {
      computed: COMPUTED_ROUTES[path],
      path,
      method,
      query,
    }
  }

  for (const [entity, config] of ENTITY_ENTRIES) {
    if (path === config.path) {
      return {
        entity,
        config,
        id: config.singleton ? config.singletonId : null,
        method,
        query,
      }
    }

    if (!config.singleton && path.startsWith(`${config.path}/`)) {
      const id = path.slice(config.path.length + 1)
      if (id) return { entity, config, id, method, query }
    }
  }

  return null
}

export function isOfflineRoute(url) {
  return parseOfflineRoute(url) !== null
}
