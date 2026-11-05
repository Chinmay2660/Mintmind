// In-memory only handoff of the unlocked vault key between pages (never persisted).
let current = null
export const setVaultSession = (s) => { current = s }
export const getVaultSession = () => current
