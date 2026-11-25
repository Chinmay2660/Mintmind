// One short name for a bank account everywhere it is picked or listed: "HDFC Savings", "ICICI Joint", "SBI Savings", "Cash".
// If two accounts would read the same, the nickname is added in brackets so they can still be told apart.
const TYPE = { savings: 'Savings', joint: 'Joint', salary: 'Salary', cash: 'Cash' }

export const shortBank = (name) => (/state bank of india/i.test(name || '') ? 'SBI' : String(name || '').replace(/\s+bank$/i, '').trim())

const base = (a) => (a.type === 'cash' ? 'Cash' : `${shortBank(a.bankName || a.nickname || 'Account')} ${TYPE[a.type] ?? ''}`.trim())

export function shortAccountName(a, all = []) {
  if (!a) return ''
  const s = base(a)
  return a.type !== 'cash' && all.filter((x) => x.type !== 'cash' && base(x) === s).length > 1 && a.nickname ? `${s} (${a.nickname})` : s
}
