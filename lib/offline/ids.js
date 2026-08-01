export function isLocalId(id) {
  return typeof id === 'string' && id.startsWith('local_')
}

export function createLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `local_${crypto.randomUUID()}`
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
