import Cash from '@/models/Cash'
import { assertAccountOwnership } from '@/lib/middleware/api'

async function adjustCash(userId, delta) {
  const cash = await Cash.findOne({ userId })
  if (cash) {
    cash.amount += delta
    await cash.save()
  }
}

async function adjustAccount(userId, accountId, delta) {
  const account = await assertAccountOwnership(userId, accountId)
  if (account) {
    account.balance += delta
    await account.save()
  }
}

/** Reverse a transaction's effect on account/cash balances. */
export async function reverseTransactionBalances(userId, tx) {
  if (tx.type === 'transfer') {
    if (tx.isCash) await adjustCash(userId, tx.amount)
    else if (tx.accountId) await adjustAccount(userId, tx.accountId, tx.amount)

    if (tx.transferToIsCash) await adjustCash(userId, -tx.amount)
    else if (tx.transferToAccountId) await adjustAccount(userId, tx.transferToAccountId, -tx.amount)
    return
  }

  const sign = tx.type === 'income' ? -1 : 1
  if (tx.isCash) await adjustCash(userId, sign * tx.amount)
  else if (tx.accountId) await adjustAccount(userId, tx.accountId, sign * tx.amount)
}

/** Apply a transaction's effect on account/cash balances. */
export async function applyTransactionBalances(userId, tx) {
  if (tx.type === 'transfer') {
    if (tx.isCash) await adjustCash(userId, -tx.amount)
    else if (tx.accountId) await adjustAccount(userId, tx.accountId, -tx.amount)

    if (tx.transferToIsCash) await adjustCash(userId, tx.amount)
    else if (tx.transferToAccountId) await adjustAccount(userId, tx.transferToAccountId, tx.amount)
    return
  }

  const sign = tx.type === 'income' ? 1 : -1
  if (tx.isCash) await adjustCash(userId, sign * tx.amount)
  else if (tx.accountId) await adjustAccount(userId, tx.accountId, sign * tx.amount)
}
