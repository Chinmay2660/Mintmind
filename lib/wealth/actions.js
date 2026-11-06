// Mutations that keep modules consistent (single source of truth, no double counting):
//  - spending lives ONLY in `expenses`; bank balance / card outstanding are adjusted here
//  - card repayments live in `cardPayments` and are never counted as expenses
//  - net worth is derived from balances, so transfers never change it
import { uid } from './db'
import { toISO, round2 } from './calc'

const today = () => toISO(new Date())

export const save = (db, table, record) => {
  const rec = { ...record, id: record.id || uid(table.slice(0, 3)) }
  return db[table].put(rec).then(() => rec)
}
export const remove = (db, table, id) => db[table].delete(id)

async function bump(db, table, id, field, delta) {
  const row = await db[table].get(id)
  if (!row) return
  await db[table].update(id, { [field]: round2((Number(row[field]) || 0) + delta) })
}

async function applyBalance(db, accountId, delta, date, note) {
  const acc = await db.bankAccounts.get(accountId)
  if (!acc) return
  const balance = round2(acc.currentBalance + delta)
  await db.bankAccounts.update(accountId, {
    currentBalance: balance,
    lastUpdated: date || today(),
  })
  await db.balanceHistory.add({ id: uid('bh'), accountId, date: date || today(), balance, note: note || '' })
}

async function applyCard(db, cardId, delta) {
  const c = await db.cards.get(cardId)
  if (!c) return
  const outstanding = Math.max(0, round2(c.outstanding + delta))
  await db.cards.update(cardId, { outstanding, available: Math.max(0, round2(c.limit - outstanding)) })
}

// Credit card spend raises the card outstanding; every other mode (UPI, cash, debit card, net banking)
// draws down the chosen bank / cash account. Legacy rows without an account are left alone.
export const CREDIT_MODE = 'card'
async function applyExpenseEffect(db, e, sign) {
  const amt = Number(e.amount) * sign
  if (e.mode === CREDIT_MODE) {
    if (e.cardId) await applyCard(db, e.cardId, amt)
  } else if (e.accountId) {
    await applyBalance(db, e.accountId, -amt, e.date, `Expense: ${e.category}`)
  }
}

/** Throws if a non-credit payment would overdraw its account, so balances never silently go negative. */
async function assertFunds(db, e, old) {
  if (e.mode === CREDIT_MODE || !e.accountId) return
  const acc = await db.bankAccounts.get(e.accountId)
  if (!acc) throw new Error('Selected account no longer exists')
  const restored = old && old.accountId === e.accountId && old.mode !== CREDIT_MODE ? Number(old.amount) : 0
  if (acc.currentBalance + restored < Number(e.amount)) throw new Error(`Insufficient balance in ${acc.nickname || acc.bankName} (₹${acc.currentBalance})`)
}

const tx = (db, tables, fn) => db.transaction('rw', tables.map((t) => db[t]), fn)

export async function addExpense(db, e) {
  const rec = { ...e, id: e.id || uid('ex'), amount: Number(e.amount) }
  await tx(db, ['expenses', 'bankAccounts', 'balanceHistory', 'cards'], async () => {
    await assertFunds(db, rec)
    await db.expenses.put(rec)
    await applyExpenseEffect(db, rec, +1)
  })
  return rec
}

export async function updateExpense(db, id, patch) {
  await tx(db, ['expenses', 'bankAccounts', 'balanceHistory', 'cards'], async () => {
    const old = await db.expenses.get(id)
    if (!old) return
    const next = { ...old, ...patch, amount: Number(patch.amount ?? old.amount) }
    await assertFunds(db, next, old)
    await applyExpenseEffect(db, old, -1)
    await db.expenses.put(next)
    await applyExpenseEffect(db, next, +1)
  })
}

export async function deleteExpense(db, id) {
  await tx(db, ['expenses', 'bankAccounts', 'balanceHistory', 'cards'], async () => {
    const old = await db.expenses.get(id)
    if (!old) return
    await applyExpenseEffect(db, old, -1)
    await db.expenses.delete(id)
  })
}

export async function setBankBalance(db, accountId, balance, { date, note } = {}) {
  await tx(db, ['bankAccounts', 'balanceHistory'], async () => {
    const acc = await db.bankAccounts.get(accountId)
    if (!acc) return
    const diff = Number(balance) - acc.currentBalance
    await db.bankAccounts.update(accountId, {
      currentBalance: Number(balance),
      lastUpdated: date || today(),
    })
    await db.balanceHistory.add({ id: uid('bh'), accountId, date: date || today(), balance: Number(balance), note: note || 'Manual update' })
  })
}

export async function addBankTxn(db, t) {
  const rec = { ...t, id: uid('bt'), amount: Number(t.amount) }
  await tx(db, ['bankTxns', 'bankAccounts', 'balanceHistory'], async () => {
    await db.bankTxns.add(rec)
    // income -> +, debit/transfer-out -> -
    const delta = rec.type === 'income' ? rec.amount : -rec.amount
    await applyBalance(db, rec.accountId, delta, rec.date, rec.description)
    // an internal transfer between two own accounts also credits the destination
    if (rec.type === 'transfer' && rec.toAccountId) await applyBalance(db, rec.toAccountId, rec.amount, rec.date, `Transfer from account`)
  })
  return rec
}

export async function deleteBankAccount(db, id) {
  await tx(db, ['bankAccounts', 'balanceHistory', 'bankTxns', 'debitCards'], async () => {
    await db.bankAccounts.delete(id)
    await db.balanceHistory.where('accountId').equals(id).delete()
    await db.bankTxns.where('accountId').equals(id).delete()
    await db.debitCards.where('accountId').equals(id).delete()
  })
}

/** Card repayment: reduces outstanding and (optionally) the paying bank balance. NOT an expense. */
export async function payCard(db, { cardId, amount, accountId, date, note }) {
  const amt = Number(amount)
  await tx(db, ['cards', 'cardPayments', 'cardStatements', 'bankAccounts', 'balanceHistory'], async () => {
    await applyCard(db, cardId, -amt)
    await db.cardPayments.add({ id: uid('pay'), cardId, date: date || today(), amount: amt, accountId: accountId || null, note: note || '' })
    if (accountId) await applyBalance(db, accountId, -amt, date, 'Credit card payment')
    const pending = (await db.cardStatements.where('cardId').equals(cardId).toArray()).filter((s) => s.status !== 'paid').sort((a, b) => a.statementDate.localeCompare(b.statementDate))
    let left = amt
    for (const s of pending) {
      if (left >= s.amount) {
        await db.cardStatements.update(s.id, { status: 'paid' })
        left -= s.amount
      }
    }
  })
}

export async function deleteCard(db, id) {
  await tx(db, ['cards', 'cardPayments', 'cardStatements'], async () => {
    await db.cards.delete(id)
    await db.cardPayments.where('cardId').equals(id).delete()
    await db.cardStatements.where('cardId').equals(id).delete()
    // expenses keep their history but are detached from the removed card
    await db.expenses.where('date').above('0').modify((e) => {
      if (e.cardId === id) e.cardId = null
    })
  })
}

// ---- Mutual funds ----
export async function addFund(db, f) {
  const units = Number(f.units) || 0
  const rec = {
    ...f,
    id: f.id || uid('mf'),
    units,
    purchaseNav: Number(f.purchaseNav) || 0,
    currentNav: Number(f.currentNav) || 0,
    invested: Number(f.invested) || 0,
    currentValue: Number(f.currentValue) || round2(units * (Number(f.currentNav) || 0)),
    navSource: 'manual',
    navDate: f.navDate || today(),
  }
  await tx(db, ['funds', 'fundTxns'], async () => {
    await db.funds.put(rec)
    if (rec.invested > 0) {
      await db.fundTxns.add({ id: uid('ft'), fundId: rec.id, date: rec.investmentDate || today(), type: 'lumpsum', amount: rec.invested, nav: rec.purchaseNav, units })
    }
  })
  return rec
}

/** NAV update: manual, or from the weekly shared price cache (source 'market'). */
export async function updateNav(db, fundId, nav, date, source = 'manual', extra = {}) {
  const f = await db.funds.get(fundId)
  if (!f) return
  const n = Number(nav)
  await db.funds.update(fundId, {
    prevNav: f.currentNav,
    currentNav: n,
    currentValue: round2(f.units * n),
    navDate: date || today(),
    navSource: source,
    ...extra,
  })
}

/** Record a statement/instalment purchase: adds units and invested amount, recomputes value. */
export async function addFundInvestment(db, fundId, { date, amount, nav, type = 'lumpsum' }) {
  const amt = Number(amount)
  const n = Number(nav)
  if (!(amt > 0) || !(n > 0)) throw new Error('Amount and NAV must be positive')
  await tx(db, ['funds', 'fundTxns'], async () => {
    const f = await db.funds.get(fundId)
    const units = round2(amt / n * 1000) / 1000
    const totalUnits = round2((f.units + units) * 1000) / 1000
    const invested = round2(f.invested + amt)
    await db.fundTxns.add({ id: uid('ft'), fundId, date, type, amount: amt, nav: n, units })
    await db.funds.update(fundId, {
      units: totalUnits,
      invested,
      purchaseNav: round2(invested / totalUnits),
      currentValue: round2(totalUnits * f.currentNav),
    })
  })
}

export async function deleteFund(db, id) {
  await tx(db, ['funds', 'fundTxns', 'sips'], async () => {
    await db.funds.delete(id)
    await db.fundTxns.where('fundId').equals(id).delete()
    await db.sips.where('fundId').equals(id).delete()
  })
}

/** Mark the next SIP instalment as paid: books an investment at the fund's current NAV. */
export async function recordSipInstalment(db, sipId, date) {
  const sip = await db.sips.get(sipId)
  if (!sip) return
  if (sip.accountId) await assertFunds(db, { mode: 'bank', accountId: sip.accountId, amount: sip.amount })
  const f = await db.funds.get(sip.fundId)
  if (f?.currentNav > 0) await addFundInvestment(db, sip.fundId, { date: date || today(), amount: sip.amount, nav: f.currentNav, type: 'sip' })
  if (sip.accountId) await applyBalance(db, sip.accountId, -Number(sip.amount), date, 'SIP instalment')
  const completed = (sip.instalmentsCompleted || 0) + 1
  await db.sips.update(sipId, {
    instalmentsCompleted: completed,
    status: sip.instalmentsTotal && completed >= sip.instalmentsTotal ? 'completed' : sip.status,
  })
}

// ---- Policies ----
export async function recordPremiumPaid(db, policyId, date) {
  const p = await db.policies.get(policyId)
  if (!p) return
  if (p.accountId) await assertFunds(db, { mode: 'bank', accountId: p.accountId, amount: p.premium })
  const step = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12, single: 0 }[p.frequency] ?? 12
  const { addMonths } = await import('./calc')
  await tx(db, ['policies', 'premiums', 'bankAccounts', 'balanceHistory'], async () => {
    await db.premiums.add({ id: uid('pr'), policyId, date: date || today(), amount: p.premium })
    if (p.accountId) await applyBalance(db, p.accountId, -Number(p.premium), date, `Premium: ${p.policyName}`)
    if (step > 0) await db.policies.update(policyId, { nextPremium: addMonths(p.nextPremium || date || today(), step) })
  })
}

export async function deletePolicy(db, id) {
  await tx(db, ['policies', 'premiums'], async () => {
    await db.policies.delete(id)
    await db.premiums.where('policyId').equals(id).delete()
  })
}

// ---- Net worth snapshots ----
export async function upsertSnapshot(db, nw, date = today()) {
  const id = date.slice(0, 7)
  const cur = await db.snapshots.get(id)
  const next = {
    id,
    date,
    assets: nw.assets,
    liabilities: nw.liabilities,
    netWorth: nw.netWorth,
    assetBreakdown: nw.assetBreakdown,
    liabilityBreakdown: nw.liabilityBreakdown,
  }
  if (cur && cur.netWorth === next.netWorth && cur.assets === next.assets && cur.liabilities === next.liabilities && cur.date === date) return
  await db.snapshots.put(next)
}

// ---- Income ----
export async function addIncome(db, { accountId, amount, date, category, description }) {
  const amt = Number(amount)
  if (!(amt > 0)) throw new Error('Amount must be greater than zero')
  if (!accountId) throw new Error('Choose the account that received it')
  const rec = { id: uid('bt'), accountId, type: 'income', amount: amt, date: date || today(), category: category || 'Other', description: description || category || 'Income' }
  await tx(db, ['bankTxns', 'bankAccounts', 'balanceHistory'], async () => {
    await db.bankTxns.add(rec)
    await applyBalance(db, accountId, amt, rec.date, rec.description)
  })
  return rec
}

export async function deleteIncome(db, id) {
  await tx(db, ['bankTxns', 'bankAccounts', 'balanceHistory'], async () => {
    const t = await db.bankTxns.get(id)
    if (!t) return
    await applyBalance(db, t.accountId, -Number(t.amount), t.date, 'Income removed')
    await db.bankTxns.delete(id)
  })
}

// ---- Transfers ----
// from / to = { type: 'account' | 'card', id }. Accounts are bank or cash accounts. A debit card is just a way of
// reaching its linked account, so the UI resolves it to { type: 'account' } before calling this.
//   account -> account : moves money (ATM withdrawal = bank -> cash)
//   account -> card    : pays the credit card bill (reduces outstanding; never an expense)
//   card    -> account : cash advance (raises outstanding, credits the account)
async function applyTransferEffect(db, t, sign) {
  const amt = Number(t.amount) * sign
  if (t.fromType === 'account') await applyBalance(db, t.fromId, -amt, t.date, 'Transfer out')
  else await applyCard(db, t.fromId, amt)
  if (t.toType === 'account') await applyBalance(db, t.toId, amt, t.date, 'Transfer in')
  else await applyCard(db, t.toId, -amt)
}

export async function addTransfer(db, { from, to, amount, date, note }) {
  const amt = Number(amount)
  if (!(amt > 0)) throw new Error('Amount must be greater than zero')
  if (!from?.id || !to?.id) throw new Error('Choose where the money moves from and to')
  if (from.type === to.type && from.id === to.id) throw new Error('From and to must be different')
  if (from.type === 'card' && to.type === 'card') throw new Error('Choose a bank or cash account on one side')
  const rec = { id: uid('tr'), date: date || today(), amount: amt, fromType: from.type, fromId: from.id, toType: to.type, toId: to.id, note: note || '' }
  await tx(db, ['transfers', 'bankAccounts', 'balanceHistory', 'cards', 'cardPayments'], async () => {
    if (from.type === 'account') await assertFunds(db, { mode: 'bank', accountId: from.id, amount: amt })
    if (to.type === 'card') {
      const c = await db.cards.get(to.id)
      if (!c) throw new Error('Card no longer exists')
      if (amt > c.outstanding) throw new Error('Payment is more than the card outstanding')
    }
    if (from.type === 'card') {
      const c = await db.cards.get(from.id)
      if (!c) throw new Error('Card no longer exists')
      if (amt > c.limit - c.outstanding) throw new Error('Amount is more than the available credit limit')
    }
    await db.transfers.add(rec)
    await applyTransferEffect(db, rec, +1)
    if (to.type === 'card') await db.cardPayments.add({ id: uid('pay'), cardId: to.id, date: rec.date, amount: amt, accountId: from.type === 'account' ? from.id : null, note: note || 'Transfer', transferId: rec.id })
  })
  return rec
}

export async function deleteTransfer(db, id) {
  await tx(db, ['transfers', 'bankAccounts', 'balanceHistory', 'cards', 'cardPayments'], async () => {
    const t = await db.transfers.get(id)
    if (!t) return
    await applyTransferEffect(db, t, -1)
    await db.cardPayments.where('cardId').equals(t.toType === 'card' ? t.toId : '').filter((p) => p.transferId === id).delete()
    await db.transfers.delete(id)
  })
}

// ---- Categories ----
// Categories live in meta key 'categories' = { expense: string[], income: string[] }.
export async function saveCategories(db, cats) {
  await db.meta.put({ key: 'categories', value: cats })
}

/** Rename everywhere: past entries, and the per-month category budget keys. */
export async function renameCategory(db, kind, from, to) {
  const next = to.trim()
  if (!next || next === from) return
  await tx(db, ['meta', 'expenses', 'bankTxns', 'budgets'], async () => {
    const row = await db.meta.get('categories')
    const cats = { expense: [], income: [], ...(row?.value || {}) }
    if (cats[kind].includes(next)) throw new Error('That category already exists')
    cats[kind] = cats[kind].map((c) => (c === from ? next : c))
    await db.meta.put({ key: 'categories', value: cats })
    if (kind === 'expense') {
      await db.expenses.where('category').equals(from).modify({ category: next })
      for (const b of await db.budgets.toArray()) {
        if (b.categories && from in b.categories) {
          const { [from]: v, ...rest } = b.categories
          await db.budgets.put({ ...b, categories: { ...rest, [next]: v } })
        }
      }
    } else {
      await db.bankTxns.filter((t) => t.type === 'income' && t.category === from).modify({ category: next })
    }
  })
}

/** Delete a category; its entries move to 'Other' (created if missing) so nothing is lost. */
export async function deleteCategory(db, kind, name) {
  await tx(db, ['meta', 'expenses', 'bankTxns', 'budgets'], async () => {
    const row = await db.meta.get('categories')
    const cats = { expense: [], income: [], ...(row?.value || {}) }
    cats[kind] = cats[kind].filter((c) => c !== name)
    if (!cats[kind].includes('Other')) cats[kind].push('Other')
    await db.meta.put({ key: 'categories', value: cats })
    if (kind === 'expense') {
      await db.expenses.where('category').equals(name).modify({ category: 'Other' })
      for (const b of await db.budgets.toArray()) {
        if (b.categories && name in b.categories) {
          const { [name]: v, ...rest } = b.categories
          await db.budgets.put({ ...b, categories: { ...rest, Other: (rest.Other || 0) + (Number(v) || 0) } })
        }
      }
    } else {
      await db.bankTxns.filter((t) => t.type === 'income' && t.category === name).modify({ category: 'Other' })
    }
  })
}

/** Import parsed statement transactions (see statementImport.js). Creates missing funds, skips transactions already
 *  recorded, applies purchases and redemptions, and leaves existing NAVs alone. Returns counts. */
export async function importStatement(db, groups) {
  const { positionFrom, fundKey } = await import('./statementImport')
  const out = { funds: 0, added: 0, skipped: 0 }
  await tx(db, ['funds', 'fundTxns'], async () => {
    const existing = await db.funds.toArray()
    for (const g of groups) {
      let fund = existing.find((f) => fundKey({ folio: f.folio, name: f.name }) === g.key) || existing.find((f) => fundKey({ name: f.name }).split('|')[1] === g.key.split('|')[1])
      const had = await (fund ? db.fundTxns.where('fundId').equals(fund.id).toArray() : [])
      const fresh = g.txns.filter((t) => !had.some((h) => h.date === t.date && Math.abs(Math.abs(h.amount) - t.amount) < 1 && (h.type === 'redeem') === (t.type === 'redeem')))
      out.skipped += g.txns.length - fresh.length
      if (!fresh.length) continue
      const last = g.txns[g.txns.length - 1]
      if (!fund) {
        fund = { id: uid('mf'), name: g.name, fundHouse: g.fundHouse || '', category: '', folio: g.folio || '', investmentType: 'Statement import', units: 0, invested: 0, purchaseNav: 0, currentNav: last.nav, currentValue: 0, navSource: 'statement', navDate: last.date, investmentDate: g.txns[0].date }
        existing.push(fund)
        out.funds++
      }
      for (const t of fresh) await db.fundTxns.add({ id: uid('ft'), fundId: fund.id, date: t.date, type: t.type, amount: t.amount, nav: t.nav, units: t.units })
      const pos = positionFrom(fresh, { units: Number(fund.units) || 0, invested: Number(fund.invested) || 0 })
      const nav = Number(fund.currentNav) || last.nav
      fund.units = pos.units; fund.invested = pos.invested
      await db.funds.put({ ...fund, units: pos.units, invested: pos.invested, purchaseNav: pos.units > 0 ? round2(pos.invested / pos.units) : 0, currentNav: nav, currentValue: round2(pos.units * nav) })
      out.added += fresh.length
    }
  })
  return out
}
