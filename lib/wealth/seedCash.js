/**
 * Every real (non-demo) profile starts with a Cash wallet at zero. It is created once: the `cashSeeded` flag stops it
 * coming back after the person deletes it, and an existing cash account is never duplicated. Returns true if it created one.
 */
export async function seedCashAccount(db, now = new Date()) {
  if (await db.meta.get('cashSeeded')) return false
  let created = false
  if (!(await db.bankAccounts.toArray()).some((a) => a.type === 'cash')) {
    await db.bankAccounts.put({ id: 'bank_cash', bankName: 'Cash', holderName: '-', nickname: 'Cash in hand', accountNumber: '', ifsc: '', type: 'cash', currentBalance: 0, mab: 0, notes: '', lastUpdated: now.toISOString().slice(0, 10) })
    created = true
  }
  await db.meta.put({ key: 'cashSeeded', value: true })
  return created
}
