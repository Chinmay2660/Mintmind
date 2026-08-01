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
  transactions: {
    path: '/transactions',
    table: 'transactions',
    syncOrder: 2,
  },
}

export function parseOfflineRoute(url, method = 'GET') {
  const path = url.split('?')[0].replace(/\/$/, '') || '/'
  const query = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams()

  for (const [entity, config] of Object.entries(ENTITIES)) {
    if (path === config.path) {
      return { entity, config, id: null, method, query }
    }
    if (path.startsWith(`${config.path}/`)) {
      const id = path.slice(config.path.length + 1)
      if (id) return { entity, config, id, method, query }
    }
  }

  return null
}

export function isOfflineRoute(url) {
  return parseOfflineRoute(url) !== null
}
