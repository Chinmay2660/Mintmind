/**
 * Every real (non-demo) profile always has one account called "Cash", starting at zero. It cannot be added or deleted by hand:
 * if it is missing it is created again, and an older one named "Cash in hand" is renamed. An existing cash account is never
 * duplicated. Returns true if it created one.
 */
export async function seedCashAccount(db, now = new Date()) {
  const cash = (await db.bankAccounts.toArray()).filter((a) => a.type === 'cash')
  for (const a of cash) if (a.nickname === 'Cash in hand') await db.bankAccounts.put({ ...a, nickname: 'Cash' })
  if (cash.length) return false
  await db.bankAccounts.put({ id: 'bank_cash', bankName: 'Cash', holderName: '-', nickname: 'Cash', accountNumber: '', ifsc: '', type: 'cash', currentBalance: 0, mab: 0, notes: '', lastUpdated: now.toISOString().slice(0, 10) })
  return true
}
