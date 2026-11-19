// Every keyboard shortcut in one place: the handler and the help dialog both read this, so they cannot disagree.

export interface Shortcut { keys: string[]; label: string; /** shown as "then" between keys, for two key sequences */ then?: boolean }
export interface ShortcutGroup { title: string; items: Shortcut[] }

export const GO_TO: Record<string, { label: string; path: string }> = {
  d: { label: 'Overview', path: '/dashboard' },
  n: { label: 'Net worth', path: '/dashboard/net-worth' },
  a: { label: 'Accounts', path: '/dashboard/bank-accounts' },
  i: { label: 'Investments', path: '/dashboard/mutual-funds' },
  c: { label: 'Cards', path: '/dashboard/credit-cards' },
  t: { label: 'Transactions and budgets', path: '/dashboard/budget' },
  f: { label: 'Family circle', path: '/dashboard/family' },
  v: { label: 'Vault', path: '/dashboard/vault' },
  w: { label: 'Wealth AI', path: '/dashboard/ai' },
  l: { label: 'Ledger', path: '/dashboard/ledger' },
  s: { label: 'Settings', path: '/dashboard/settings' },
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Add something',
    items: [
      { keys: ['A'], label: 'Add a transaction' },
      { keys: ['C'], label: 'Add an account' },
      { keys: ['N'], label: 'Add an asset' },
      { keys: ['I'], label: 'Add an investment' },
      { keys: ['L'], label: 'Add a liability' },
      { keys: ['O'], label: 'Create a financial goal' },
    ],
  },
  {
    title: 'Go to a page',
    items: Object.entries(GO_TO).map(([k, v]) => ({ keys: ['G', k.toUpperCase()], label: v.label, then: true })),
  },
  {
    title: 'On the Transactions & budgets page',
    items: [
      { keys: ['1-9'], label: 'Switch tab: Overview, Budgets, Transactions, Calendar, Monthly, Summary, Recurring, Stats, Cash flow' },
      { keys: ['['], label: 'Previous month' },
      { keys: [']'], label: 'Next month' },
      { keys: ['J'], label: 'Next page of transactions' },
      { keys: ['K'], label: 'Previous page of transactions' },
      { keys: ['S'], label: 'Start or stop selecting transactions' },
    ],
  },
  {
    title: 'Everywhere',
    items: [
      { keys: ['/'], label: 'Search everything' },
      { keys: ['Ctrl', 'K'], label: 'Search everything (also ⌘ K on a Mac)' },
      { keys: ['W'], label: 'Open Wealth AI' },
      { keys: ['P'], label: 'Hide or show balances' },
      { keys: ['T'], label: 'Switch between light and dark' },
      { keys: ['?'], label: 'Show this list' },
      { keys: ['Esc'], label: 'Close a dialog, menu or panel' },
    ],
  },
  {
    title: 'Lists and menus',
    items: [
      { keys: ['↑', '↓'], label: 'Move through results and menu items' },
      { keys: ['Enter'], label: 'Open the highlighted item' },
      { keys: ['Tab'], label: 'Move to the next control' },
      { keys: ['Space'], label: 'Press the focused button or tick the focused box' },
    ],
  },
]
